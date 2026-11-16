import { html, nothing, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import iconWorldOff from '@tabler/icons/outline/world-off.svg';
import type { GraphEdge } from '../model/graph-edge';
import { portLabel } from '../model/graph-edge';
import type { GraphNode } from '../model/graph-node';
import { emptyNetBox, NODE_SIZE, portLabelReach } from '../model/layout';
import type { Net } from '../model/logical-nodes/net';
import type { Data } from '../model/logical-nodes/data-node';
import type { Router } from '../model/physical-nodes/connector';
import type { PhysicalNode } from '../model/physical-nodes/physical-node';
import type { WwNetwork } from '../widgets/ww-network';

/** Room around the diagram that a view keeps free for the names and labels at its border. */
const FIT_PADDING = 20;

/** The gap between a net and what it holds, as the names under the hosts are inside it. */
const NET_PADDING = 18;
const NET_FILL = 40;

function netTemplate(this: WwNetwork, net: Net, editing: boolean): TemplateResult {
    const label = net.has('unconfigured-net') ? this.msg('Unconfigured') : net.name;
    const children = this.diagram.childrenOf(net.id);
    const shared = {
        class: `net ${net.cssClass.join(' ')}`,
        key: net.id,
        style: styleMap({ fill: `color-mix(in srgb, ${net.color} ${NET_FILL}%, transparent)` }),
    };
    if (children.length === 0) {
        const box = emptyNetBox(net);
        return html`
            <ww-shape
                class=${shared.class}
                kind="rect"
                radius="4"
                data-ww-key=${shared.key}
                x=${box.x}
                y=${box.y}
                width=${box.width}
                height=${box.height}
                style=${shared.style}
                aria-label=${label}
                selectable
                ?movable=${editing}
            ></ww-shape>
        `;
    }
    return html`
        <ww-group
            class=${shared.class}
            data-ww-key=${shared.key}
            frame
            padding=${NET_PADDING}
            radius="4"
            label=${label ?? ''}
            x="0"
            y="0"
            style=${shared.style}
            aria-label=${label}
            selectable
            ?movable=${editing}
        >
            ${children.map((child) => memberTemplate.call(this, child, editing))}
        </ww-group>
    `;
}

function memberTemplate(this: WwNetwork, node: GraphNode, editing: boolean): TemplateResult | typeof nothing {
    if (node.has('net-node')) return netTemplate.call(this, node as Net, editing);
    if (node.has('physical-node')) return physicalNodeTemplate.call(this, node as PhysicalNode, editing);
    return nothing;
}

function edgeTemplate(this: WwNetwork, edge: GraphEdge): TemplateResult {
    const from = this.diagram.node<PhysicalNode>(edge.source);
    const to = this.diagram.node<PhysicalNode>(edge.target);
    return html`
        <ww-path
            class="color-edge ${edge.cssClass.join(' ')}"
            data-ww-key=${edge.id}
            from=${edge.source}
            to=${edge.target}
            route="straight"
            style=${styleMap({ stroke: edge.color })}
            selectable
        >
            ${from && to ? edgeLabelsTemplate.call(this, edge, from, to) : nothing}
        </ww-path>
    `;
}

function edgeLabelsTemplate(this: WwNetwork, edge: GraphEdge, from: PhysicalNode, to: PhysicalNode) {
    if (edge.has('unconfigured-edge')) {
        return html`<ww-text follow at="middle" side="below">${this.msg('Please assign ports/interfaces')}</ww-text>`;
    }
    if (!edge.has('labelled-edge')) return nothing;
    const reach = portLabelReach(from, to);
    return html`
        <ww-text follow at="start" along=${reach} side="above">${portLabel(edge.from, edge.inPort)}</ww-text>
        <ww-text follow at="end" along=${-reach} side="below">${portLabel(edge.to, edge.outPort)}</ww-text>
    `;
}

function nodeBackground(this: WwNetwork, node: PhysicalNode): Record<string, string> {
    const picture = `url("${node.backgroundPath}")`;
    if (!node.has('gateway-node')) return { backgroundColor: node.color, backgroundImage: picture };
    const colors = ((node as Router).nets ?? []).map((net) => net.color);
    if (colors.length === 0) colors.push('grey');
    if (colors.length === 1) colors.push(colors[0]);
    return { backgroundImage: `${picture}, linear-gradient(to bottom, ${colors.join(', ')})` };
}

function physicalNodeTemplate(this: WwNetwork, node: PhysicalNode, editing: boolean): TemplateResult {
    const linking = editing && this.drawModeOn;
    const lacksGateway =
        node.has('default-gateway-not-found') && !node.defaultGateway && !!this.diagram.netOf(node.id)?.gateways.size;
    return html`
        <ww-node
            class="${node.cssClass.join(' ')} ${this.editing ? 'deletable' : ''}"
            data-ww-key=${node.id}
            x=${node.x - NODE_SIZE / 2}
            y=${node.y - NODE_SIZE / 2}
            width=${NODE_SIZE}
            height=${NODE_SIZE}
            aria-label=${node.name}
            outline="rounded"
            radius="5"
            data-ww-link=${linking ? 'edge' : nothing}
            data-ww-accept=${linking ? 'edge' : nothing}
            selectable
            ?movable=${editing}
        >
            <span class="picture" style=${styleMap(nodeBackground.call(this, node))}></span>
            <span class="name">${node.name}</span>
            ${lacksGateway ? html`<sl-icon class="badge" src=${iconWorldOff}></sl-icon>` : nothing}
        </ww-node>
    `;
}

function dataLabel(this: WwNetwork, data: Data): string {
    if (data.has('data-node-layer2-layer3')) return this.msg('L2 L3 Data');
    if (data.has('arp-req-node')) return this.msg('L2 ARP request');
    if (data.has('arp-res-node')) return this.msg('L2 ARP reply');
    if (data.has('data-node-layer3')) return this.msg('L3 Data');
    return '';
}

function dataNodeTemplate(this: WwNetwork, data: Data): TemplateResult {
    return html`
        <ww-node class=${data.cssClass.join(' ')} x=${data.x - 30} y=${data.y - 7.5} width="60" height="15"
            >${dataLabel.call(this, data)}</ww-node
        >
    `;
}

/** The diagram as scene elements: nets and edges are drawn, nodes, labels and packets are HTML above them. */
export function sceneTemplate(this: WwNetwork): TemplateResult {
    const diagram = this.diagram;
    const editing = this.mode === 'edit';
    const nodes: GraphNode[] = [...diagram.nodes.values()];
    const loose = (node: GraphNode) => !diagram.node(node.parent)?.has('net-node');
    const edges = [...diagram.edges.values()];

    return html`
        <ww-scene
            select="single"
            data-ww-viewport="canvas"
            data-ww-viewport-zoom="0.5 5"
            data-ww-viewport-wheel="zoom"
            data-ww-viewport-start="fit"
            data-ww-viewport-fit-padding=${FIT_PADDING}
            aria-label=${this.msg('Network')}
            @ww-select=${this.onSelect}
            @ww-move=${this.onMove}
            @ww-connect=${this.onConnect}
            @ww-moving=${this.onMoving}
            @ww-context=${this.onContext}
        >
            ${nodes.filter(loose).map((node) => memberTemplate.call(this, node, editing))}
            ${edges.map((edge) => edgeTemplate.call(this, edge))}
            ${nodes.filter((node) => node.has('data-node')).map((node) => dataNodeTemplate.call(this, node as Data))}
        </ww-scene>
    `;
}
