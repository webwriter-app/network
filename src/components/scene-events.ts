import type { ConnectDetail, ContextDetail, MoveDetail, MovingDetail, SelectDetail } from '@webwriter/widget/scene';
import type { SlMenu, SlMenuItem, SlTab } from '@shoelace-style/shoelace';
import type { VirtualElement } from '@shoelace-style/shoelace/dist/components/popup/popup.component.js';
import { GraphEdge } from '../model/graph-edge';
import type { GraphNode } from '../model/graph-node';
import { contains, emptyNetBox, moveNode, netBoxOf, NODE_SIZE, type Box } from '../model/layout';
import type { Net } from '../model/logical-nodes/net';
import { addGateway, dropIntoNet } from '../model/subnetting';
import type { WwNetwork } from '../widgets/ww-network';
import { hasSimulationTableEntries } from './context-menu';

/** How far past the border of a net a node can be dropped and still count as inside, or as still inside. */
const DROP_MARGIN = 10;

/** The diagram element a scene item stands for. */
function elementOf(network: WwNetwork, key: string | null | undefined): GraphNode | GraphEdge | undefined {
    if (!key) return undefined;
    return network.diagram.node(key) ?? network.diagram.edges.get(key);
}

export function handleSelect(this: WwNetwork, event: CustomEvent<SelectDetail>): void {
    const key = event.detail.keys[0];
    if (this.picking && key) {
        if (this.packetSimulator.pickEndPoint(this.picking, key)) this.closeContextMenu();
        this.picking = null;
        return;
    }
    const selected = elementOf(this, key);
    if (!selected) return;
    this.selectedObject = selected;
    this.closeContextMenu();
}

/** The nets in which a node counts as dropped, innermost first. */
function dropTargets(network: WwNetwork, node: GraphNode, boxes: Map<string, Box>): Net[] {
    const diagram = network.diagram;
    const inside = (net: Net) => {
        for (let parent: GraphNode | undefined = net; parent; parent = diagram.node(parent.parent)) {
            if (parent === node) return true;
        }
        return false;
    };
    return diagram
        .nets()
        .filter((net) => !inside(net) && boxes.has(net.id) && contains(boxes.get(net.id)!, node.x, node.y, DROP_MARGIN))
        .filter((net) => !(net.has('unconfigured-net') && diagram.subnettingMode == 'NET_BASED'))
        .sort((a, b) => boxes.get(a.id)!.width * boxes.get(a.id)!.height - boxes.get(b.id)!.width * boxes.get(b.id)!.height);
}

/**
 * What a node dropped inside or outside of a net does to its membership. Only nodes without edges
 * can change net. The boxes are those of the nets before the node moved.
 */
function dropNode(network: WwNetwork, node: GraphNode, boxes: Map<string, Box>): void {
    const diagram = network.diagram;
    if (!node.has('net-node') && diagram.edgesOf(node.id).length > 0) return;

    const parent = diagram.node<Net>(node.parent);
    const target = dropTargets(network, node, boxes)[0];
    if (target?.id === parent?.id) return;

    if (parent) {
        // A net without content stays where its content was.
        const box = boxes.get(parent.id);
        if (box) {
            parent.x = box.x + box.width / 2;
            parent.y = box.y + box.height / 2;
        }
        node.parent = undefined;
    }
    if (target) {
        node.parent = target.id;
        dropIntoNet(diagram, node, target);
    }
}

/** A move has begun: the nets stay as they were drawn until it is over, for what is dropped on them. */
export function handleMoving(this: WwNetwork, event: CustomEvent<MovingDetail>): void {
    this.frames = event.detail.state === 'end' ? null : (this.frames ?? this.drawnFrames());
}

export function handleMove(this: WwNetwork, event: CustomEvent<MoveDetail>): void {
    if (this.mode !== 'edit') return void event.preventDefault();
    const diagram = this.diagram;
    this.closeContextMenu();

    const boxes = new Map<string, Box>();
    for (const net of diagram.nets()) {
        const box = netBoxOf(diagram, net);
        if (box) boxes.set(net.id, box);
    }
    const moved: GraphNode[] = [];
    for (const { key, x, y } of event.detail.items) {
        const node = diagram.node(key);
        if (!node) continue;
        if (node.has('net-node')) {
            // A net with content is a group that stays at the origin: its new place is the movement. An empty net is a box.
            const origin = diagram.childrenOf(node.id).length === 0 ? emptyNetBox(node as Net) : { x: 0, y: 0 };
            moveNode(diagram, node, x - origin.x, y - origin.y);
        } else {
            node.x = x + NODE_SIZE / 2;
            node.y = y + NODE_SIZE / 2;
        }
        moved.push(node);
        if (this.mutexDragAndDrop === 'subnetting') dropNode(this, node, boxes);
    }
    if (this.mutexDragAndDrop === 'gateway') {
        // The router counts where the pointer let go of it; a move by keyboard has no pointer.
        const at = event.detail.pointer;
        for (const node of moved) addGateway(diagram, node.id, at?.x ?? node.x, at?.y ?? node.y);
    }
    this.frames = null;
    this.apply();
}

export function handleConnect(this: WwNetwork, event: CustomEvent<ConnectDetail>): void {
    const diagram = this.diagram;
    const [from] = event.detail.from.split(':');
    const [to] = event.detail.to.split(':');
    const verdict = this.mode === 'edit' && this.drawModeOn ? diagram.canConnect(from, to) : '';
    if (verdict !== true) {
        event.preventDefault();
        if (verdict) diagram.notify('warning', verdict, '');
        return;
    }
    this.apply(() => diagram.connect(from, to));
}

export async function handleContext(this: WwNetwork, event: CustomEvent<ContextDetail>): Promise<void> {
    event.preventDefault();
    const selected = elementOf(this, event.detail.key);
    if (!selected) return this.closeContextMenu();
    const { clientX, clientY } = event.detail.point;
    await openContextMenu.call(this, selected, clientX, clientY);
}

async function openContextMenu(this: WwNetwork, selected: GraphNode | GraphEdge, clientX: number, clientY: number) {
    this.closeConfigDrawers();
    this.selectedObject = selected;

    if (selected instanceof GraphEdge) {
        this.selectedPorts = {
            source: { connectionType: null, port: 0 },
            target: { connectionType: null, port: 0 },
        };
        const { inPort, outPort } = selected;
        if (inPort != undefined && inPort != null && !Number.isNaN(inPort)) {
            this.selectedPorts.source.port = inPort;
            this.selectedPorts.source.connectionType = selected.from.portData.get(inPort)?.get('Connection Type');
        }
        if (outPort != undefined && outPort != null && !Number.isNaN(outPort)) {
            this.selectedPorts.target.port = outPort;
            this.selectedPorts.target.connectionType = selected.to.portData.get(outPort)?.get('Connection Type');
        }
    }

    if (
        this.mode === 'simulate' &&
        (selected instanceof GraphEdge || selected.has('net-node') || !hasSimulationTableEntries(selected))
    ) {
        this.closeContextMenu();
        return;
    }

    const canvas = this.canvas;
    const anchor: VirtualElement = {
        contextElement: canvas,
        getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0),
    };
    this.contextMenuColorOpen = false;
    this.contextMenuAnchor = anchor;
    await this.updateComplete;
    const popup = this.contextMenu;
    await popup?.updateComplete;
    if (this.contextMenuAnchor !== anchor || !popup) return;
    popup.reposition();
    const menu = popup.querySelector<SlMenu>('sl-menu');
    await menu?.updateComplete;
    const firstControl = popup.querySelector<SlMenuItem | SlTab>('sl-menu-item, sl-tab');
    await firstControl?.updateComplete;
    if (menu && firstControl) menu.setCurrentItem(firstControl as SlMenuItem);
    if (this.contextMenuAnchor === anchor) {
        const focusTarget = firstControl ?? popup.querySelector<HTMLElement>('.contextmenu--tables');
        focusTarget?.focus({ preventScroll: true });
    }
}
