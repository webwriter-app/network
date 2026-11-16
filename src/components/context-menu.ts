import SlColorPicker from '@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js';
import SlDrawer from '@shoelace-style/shoelace/dist/components/drawer/drawer.component.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.component.js';
import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import type SlMenuItem from '@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js';
import type SlMenu from '@shoelace-style/shoelace/dist/components/menu/menu.component.js';
import type { SlChangeEvent } from '@shoelace-style/shoelace';
import { html, nothing, TemplateResult } from 'lit';
import { WwNetwork } from '../widgets/ww-network';
import { Ipv4Address } from '../model/addressing/ipv4-address';
import { Ipv6Address } from '../model/addressing/ipv6-address';
import { MacAddress } from '../model/addressing/mac-address';
import { AddressingHelper } from '../model/addressing/addressing-helper';
import { GraphEdge } from '../model/graph-edge';
import { GraphNode } from '../model/graph-node';
import { Net } from '../model/logical-nodes/net';
import type { Router } from '../model/physical-nodes/connector';
import type { PhysicalNode } from '../model/physical-nodes/physical-node';
import { RoutableDecorator } from '../model/simulation/routable';
import { SwitchableDecorator } from '../model/simulation/switchable';
import { setUpGateway } from '../model/subnetting';

import { styleMap } from 'lit/directives/style-map.js';
import { keyed } from 'lit/directives/keyed.js';
import iconNetwork from '@tabler/icons/outline/network.svg';
import iconTopologyFullHierarchy from '@tabler/icons/outline/topology-full-hierarchy.svg';
import iconWifi from '@tabler/icons/outline/wifi.svg';
import iconAbc from '@tabler/icons/outline/abc.svg';
import iconCpu from '@tabler/icons/outline/cpu.svg';
import iconPencil from '@tabler/icons/outline/pencil.svg';
import iconRouter from '@tabler/icons/outline/router.svg';
import iconSquarePlus from '@tabler/icons/outline/square-plus.svg';
import iconTrash from '@tabler/icons/outline/trash.svg';

type Selected = GraphNode | GraphEdge;

/** The node behind the selection, if it is one. */
const nodeOf = (selected: Selected): PhysicalNode => selected as PhysicalNode;

function tablesOf(node: Selected) {
    return {
        arpTable: node instanceof RoutableDecorator ? node.arpTableIpMac : undefined,
        routingTable: node instanceof RoutableDecorator ? node.routingTable : undefined,
        macAddressTable: node instanceof SwitchableDecorator ? node.macAddressTable : undefined,
    };
}

export function hasSimulationTableEntries(node: Selected): boolean {
    return Object.values(tablesOf(node)).some((table) => table instanceof Map && table.size > 0);
}

/** 'network' for a net, 'node' for a host or connector, 'edge' for a link. */
export function selectionType(selected: Selected): 'node' | 'network' | 'edge' {
    if (selected instanceof GraphEdge) return 'edge';
    return selected.has('net-node') ? 'network' : 'node';
}

export function contextMenuTemplate(this: WwNetwork): TemplateResult {
    if (!this.selectedObject) return html``;

    const type = selectionType(this.selectedObject);

    if (this.mode === 'simulate' && (type !== 'node' || !hasSimulationTableEntries(this.selectedObject))) return html``;

    const canvas = this.canvas;
    const anchorRect = this.contextMenuAnchor?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    const viewportHeight = this.ownerDocument.documentElement.clientHeight;
    const spaceAbove = anchorRect && canvasRect ? anchorRect.top - Math.max(0, canvasRect.top) : 0;
    const spaceBelow = anchorRect && canvasRect ? Math.min(viewportHeight, canvasRect.bottom) - anchorRect.bottom : 0;
    const opensUpward = spaceAbove > spaceBelow;

    return html`
        ${this.mode === 'edit' ? html`
            ${type === 'network' ? networkConfigDrawerTemplate.bind(this)() : nothing}
            ${type === 'node' ? nodeConfigDrawerTemplate.bind(this)() : nothing}
            ${type === 'edge' ? edgeConfigDrawerTemplate.bind(this)() : nothing}
        ` : nothing}

        ${this.contextMenuAnchor ? html`
            <div
                class="contextmenu-backdrop"
                @pointerdown=${() => this.closeContextMenu()}
                @wheel=${() => this.closeContextMenu()}
                @contextmenu=${(e: Event) => e.preventDefault()}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key !== 'Escape' || e.defaultPrevented) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.contextMenuColorOpen) {
                        this.contextMenuColorOpen = false;
                        this.renderRoot.querySelector<SlMenuItem>('#contextMenuColor')?.focus();
                    } else {
                        this.closeContextMenu(true);
                    }
                }}
            >
                <sl-popup
                    id="contextMenu"
                    active
                    placement=${opensUpward ? 'top-start' : 'bottom-start'}
                    flip
                    flip-fallback-placements=${opensUpward ? 'top-end bottom-start bottom-end' : 'bottom-end top-start top-end'}
                    flip-fallback-strategy="initial"
                    flip-padding="4"
                    shift
                    shift-padding="4"
                    auto-size="both"
                    auto-size-padding="4"
                    .anchor=${this.contextMenuAnchor}
                    .flipBoundary=${canvas}
                    .shiftBoundary=${canvas}
                    .autoSizeBoundary=${canvas}
                    @pointerdown=${(e: Event) => e.stopPropagation()}
                    @wheel=${(e: Event) => e.stopPropagation()}
                >
                    ${this.mode === 'simulate' ? html`
                        <div class="contextmenu contextmenu--tables" tabindex="-1" aria-label=${this.msg('Simulation tables')}>
                            ${nodeRoutingTableTemplate.bind(this)()}
                        </div>
                    ` : html`
                        <sl-menu class="contextmenu" @sl-select=${handleContextMenuSelect.bind(this)}>
                            ${contextMenuItemsTemplate.bind(this)(type)}
                        </sl-menu>
                        ${this.contextMenuColorOpen ? colorPanelTemplate.bind(this)() : nothing}
                    `}
                </sl-popup>
            </div>
        ` : nothing}
    `;
}

function contextMenuItemsTemplate(this: WwNetwork, type: 'node' | 'network' | 'edge'): TemplateResult {
    const selected = this.selectedObject!;
    const color = selected.color || '#ffffff';
    return html`
        ${type === 'node' ? html`
            <sl-menu-item value="rename" aria-label=${this.msg('Name')}>
                <span slot="prefix" aria-hidden="true"><sl-icon src=${iconAbc}></sl-icon></span>
                <sl-input
                    class="contextmenu__name"
                    size="small"
                    aria-label=${this.msg('Name')}
                    placeholder=${this.msg('Name')}
                    .value=${(selected as GraphNode).name ?? ''}
                    @click=${stopMenuControlEvent}
                    @mousedown=${stopMenuControlEvent}
                    @mouseover=${stopMenuControlEvent}
                    @focusin=${setCurrentMenuControl}
                    @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Escape') return;
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).closest<SlMenuItem>('sl-menu-item')?.focus();
                        }
                    }}
                    @sl-input=${(e: Event) => {
                        this.apply(() => ((selected as GraphNode).name = (e.target as SlInput).value));
                    }}
                ></sl-input>
            </sl-menu-item>
            <sl-divider></sl-divider>
        ` : nothing}
        <sl-menu-item value=${type + '-config'}>
            <span slot="prefix" aria-hidden="true"><sl-icon src=${type === 'network' ? iconTopologyFullHierarchy : iconNetwork}></sl-icon></span>
            ${type === 'network' ? this.msg('Define Network') : type === 'node' ? this.msg('Change Port Config') : this.msg('Define Interfaces')}
        </sl-menu-item>
        <sl-menu-item id="contextMenuColor" value="color" aria-haspopup="dialog" aria-expanded=${this.contextMenuColorOpen}>
            <span slot="prefix" aria-hidden="true"><sl-icon src=${iconPencil}></sl-icon></span>
            ${this.msg('Change color')}
            <span
                slot="suffix"
                class="contextmenu__color-swatch"
                style=${styleMap({ backgroundColor: color })}
                title=${color}
                aria-label=${color}
            ></span>
        </sl-menu-item>
        ${gatewayMenuItemTemplate.bind(this)(type)}
        <sl-divider></sl-divider>
        <sl-menu-item value="delete" class="contextmenu__delete">
            <span slot="prefix" aria-hidden="true"><sl-icon src=${iconTrash}></sl-icon></span>
            ${this.msg('Delete')}
        </sl-menu-item>
    `;
}

function stopMenuControlEvent(e: Event): void {
    e.stopPropagation();
}

function setCurrentMenuControl(e: FocusEvent): void {
    const item = (e.currentTarget as HTMLElement).closest<SlMenuItem>('sl-menu-item');
    if (item) item.closest<SlMenu>('sl-menu')?.setCurrentItem(item);
}

function gatewayMenuItemTemplate(this: WwNetwork, type: 'node' | 'network' | 'edge'): TemplateResult {
    const node = this.selectedObject as GraphNode;
    const isHost = type === 'node' && node.has('host-node') && !!node.parent;
    const gateways: Map<string, number> | undefined = type === 'network'
        ? (node as Net).gateways
        : isHost ? this.diagram.netOf(node.id)?.gateways : undefined;
    if (!gateways?.size) return html``;
    const current = type === 'network' ? (node as Net).currentDefaultGateway : (node as PhysicalNode).defaultGateway;

    return html`
        <sl-menu-item value="gateway" aria-label=${this.msg('Default Gateway')}>
            <span slot="prefix" aria-hidden="true"><sl-icon src=${iconRouter}></sl-icon></span>
            <sl-select
                class="contextmenu__gateway"
                size="small"
                hoist
                aria-label=${this.msg('Default Gateway')}
                placeholder=${this.msg('Default Gateway')}
                .value=${current?.[0] ?? ''}
                @click=${stopMenuControlEvent}
                @mousedown=${stopMenuControlEvent}
                @mouseover=${stopMenuControlEvent}
                @focusin=${setCurrentMenuControl}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key !== 'Escape') e.stopPropagation();
                }}
                @sl-change=${(e: Event) => {
                    const gateway = (e.target as SlSelect).value as string;
                    this.apply(() => {
                        const chosen: [string, number] = [gateway, gateways.get(gateway)!];
                        if (type === 'network') (node as Net).currentDefaultGateway = chosen;
                        else {
                            (node as PhysicalNode).defaultGateway = chosen;
                            node.setClass('default-gateway-not-found', false);
                        }
                    });
                }}
            >
                ${Array.from(gateways.keys()).map((key) => html`<sl-option value=${key}>${key}</sl-option>`)}
            </sl-select>
        </sl-menu-item>
    `;
}

async function handleContextMenuSelect(this: WwNetwork, e: CustomEvent<{ item: SlMenuItem }>): Promise<void> {
    if (e.target !== e.currentTarget) return;
    const item = e.detail.item;
    if (item.value === 'color') {
        this.contextMenuColorOpen = !this.contextMenuColorOpen;
        if (this.contextMenuColorOpen) {
            await this.updateComplete;
            const picker = this.renderRoot.querySelector<SlColorPicker>('#contextMenuColorPicker');
            await picker?.updateComplete;
            if (this.contextMenuColorOpen) picker?.focus({ preventScroll: true });
        }
        return;
    }
    this.contextMenuColorOpen = false;
    switch (item.value) {
        case 'rename':
            item.querySelector<SlInput>('sl-input')?.focus();
            break;
        case 'gateway':
            item.querySelector<SlSelect>('sl-select')?.show();
            break;
        case 'node-config':
            openConfigDrawer.call(this, '#nodeConfigDrawer');
            break;
        case 'network-config':
            openConfigDrawer.call(this, '#networkConfigDrawer');
            break;
        case 'edge-config':
            openConfigDrawer.call(this, '#edgeConfigDrawer');
            break;
        case 'delete':
            this.deleteSelected();
            this.closeContextMenu(true);
            break;
    }
}

function colorPanelTemplate(this: WwNetwork): TemplateResult {
    const canvas = this.canvas;
    return html`
        <sl-popup
            class="contextmenu__color-popup"
            active
            anchor="contextMenuColor"
            placement="right-start"
            distance="4"
            flip
            flip-fallback-placements="left-start bottom-start top-start"
            flip-padding="4"
            shift
            shift-padding="4"
            auto-size="both"
            auto-size-padding="4"
            .flipBoundary=${canvas}
            .shiftBoundary=${canvas}
            .autoSizeBoundary=${canvas}
        >
            <div class="contextmenu__color-panel" role="dialog" aria-label=${this.msg('Change color')}>
                <sl-color-picker
                    id="contextMenuColorPicker"
                    inline
                    label=${this.msg('Change color')}
                    .swatches=${this.colors}
                    .value=${this.selectedObject!.color || '#ffffff'}
                    @sl-change=${(e: Event) => {
                        this.apply(() => (this.selectedObject!.color = (e.target as SlColorPicker).value));
                    }}
                ></sl-color-picker>
            </div>
        </sl-popup>
    `;
}

function handleDrawerKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    (e.currentTarget as SlDrawer).hide();
}

function openConfigDrawer(this: WwNetwork, selector: string) {
    this.closeContextMenu();
    (this.shadowRoot?.querySelector(selector) as SlDrawer | null)?.show();
}

function fieldState(input: SlInput, valid: boolean, problem = '') {
    input.classList.toggle('danger', !valid);
    input.classList.toggle('success', valid);
    input.setAttribute('help-text', valid ? '' : problem);
}

function nodeConfigDrawerTemplate(this: WwNetwork) {
    const node = nodeOf(this.selectedObject!);
    const entries = node.portData ? Array.from(node.portData.entries()) : [];

    return html`
        <sl-drawer
            id="nodeConfigDrawer"
            class="configdrawer"
            contained
            placement="end"
            @keydown=${handleDrawerKeydown}
            label=${this.msg('Ports of ') + (node.name ?? '')}
            @sl-after-hide=${() => this.requestUpdate()}
        >
            ${entries.length > 0
                ? html`
                      <div class="configdrawer__stack">
                          ${entries.map(([index, port], position) => {
                              const connected = isPortConnected.bind(this)(node, index);

                              return html`
                                  ${position > 0
                                      ? html`<sl-divider class="portcard__separator"></sl-divider>`
                                      : ''}
                                  <sl-details class="portcard" ?open=${position === 0}>
                                      <div class="portcard__summary" slot="summary">
                                          <span class="portcard__index">${position + 1}</span>
                                          <span class="portcard__title"
                                              >${port.get('Name') || this.msg('Port') + ' ' + (position + 1)}</span
                                          >
                                          <sl-button
                                              class="portcard__remove"
                                              size="small"
                                              circle
                                              ?disabled=${connected}
                                              title=${connected
                                                  ? this.msg('Disconnect the port to remove it.')
                                                  : this.msg('Remove Port')}
                                              @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
                                              @click=${(e: MouseEvent) => {
                                                  e.stopPropagation();
                                                  removePort.bind(this)(node, index);
                                              }}
                                              ><sl-icon src=${iconTrash}></sl-icon></sl-button
                                          >
                                      </div>

                                      <div class="configdrawer__fields">
                                          ${port.has('Name')
                                              ? html`<sl-input
                                                    size="small"
                                                    label=${this.msg('Name')}
                                                    placeholder=${this.msg('Name')}
                                                    spellcheck="false"
                                                    value=${port.get('Name') ?? ''}
                                                    @sl-input=${(e: SlChangeEvent) => {
                                                        const v = (e.target as SlInput).value;
                                                        this.apply(() => node.portData.get(index)!.set('Name', v));
                                                    }}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('Connection Type')
                                              ? html`<sl-select
                                                    size="small"
                                                    hoist
                                                    label=${this.msg('Connection Type')}
                                                    help-text=${connected
                                                        ? this.msg('Disconnect the port to change its type.')
                                                        : ''}
                                                    value=${port.get('Connection Type')}
                                                    ?disabled=${connected}
                                                    @sl-change=${(e: SlChangeEvent) => {
                                                        const v = (e.target as SlSelect).value;
                                                        this.apply(() => node.portData.get(index)!.set('Connection Type', v));
                                                    }}
                                                >
                                                    <span slot="prefix"
                                                        ><sl-icon src=${port.get('Connection Type') === 'wireless'
                                                            ? iconWifi
                                                            : iconNetwork}></sl-icon></span
                                                    >
                                                    <sl-option value="ethernet">${this.msg('Ethernet')}</sl-option>
                                                    <sl-option value="wireless">${this.msg('Wireless')}</sl-option>
                                                </sl-select>`
                                              : ''}
                                          ${port.has('MAC')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="MAC"
                                                    placeholder="FF:FF:FF:FF:FF:FF"
                                                    spellcheck="false"
                                                    value=${port.get('MAC')?.address ?? ''}
                                                    @sl-input=${(e: SlChangeEvent) => handleMacAddressChange.call(this, node, index, e)}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('IPv4')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="IPv4"
                                                    placeholder="0.0.0.0"
                                                    spellcheck="false"
                                                    value=${port.get('IPv4')?.address ?? ''}
                                                    @sl-input=${(e: SlChangeEvent) => handleIPv4AddressChange.call(this, node, index, e)}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('IPv6')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="IPv6"
                                                    placeholder="::"
                                                    spellcheck="false"
                                                    value=${port.get('IPv6')?.address ?? ''}
                                                    @sl-input=${(e: SlChangeEvent) => handleIPv6AddressChange.call(this, node, index, e)}
                                                ></sl-input>`
                                              : ''}
                                      </div>
                                  </sl-details>
                              `;
                          })}
                      </div>
                  `
                : html`<p class="configdrawer__empty">${this.msg('No port available.')}</p>`}

            <sl-button slot="footer" size="small" variant="primary" @click=${() => addPort.call(this, node)}>
                <span slot="prefix"><sl-icon src=${iconSquarePlus}></sl-icon></span>
                ${this.msg('Add Port')}
            </sl-button>
        </sl-drawer>
    `;
}

function edgeConfigDrawerTemplate(this: WwNetwork) {
    const edge = this.selectedObject as GraphEdge;

    if (!edge) return html``;

    const source = this.diagram.node<PhysicalNode>(edge.source);
    const target = this.diagram.node<PhysicalNode>(edge.target);
    if (!source || !target) return html``;

    const availablePorts = (node: PhysicalNode) => {
        const available: number[] = [];
        node.portLinkMapping.forEach((link, port) => {
            if (link == null || link == undefined || link == '' || link === edge.id) available.push(port);
        });
        return available;
    };
    const availableSourcePorts = availablePorts(source);
    const availableTargetPorts = availablePorts(target);

    const endpointTemplate = (
        node: PhysicalNode,
        side: 'source' | 'target',
        availablePorts: number[],
        selected: number | undefined,
        role: string
    ) => {
        const other = side === 'source' ? 'target' : 'source';

        return html`
            <section class="endpoint">
                <header class="endpoint__header">
                    <div
                        class="endpoint__image"
                        style=${styleMap({
                            backgroundColor: node.color,
                            backgroundImage: `url("${node.backgroundPath}")`,
                        })}
                    ></div>
                    <div class="endpoint__names">
                        <span class="endpoint__role">${role}</span>
                        <span class="endpoint__title">${node.name}</span>
                    </div>
                </header>

                <div class="configdrawer__fields">
                    <sl-select
                        size="small"
                        hoist
                        clearable
                        label=${this.msg('Port')}
                        placeholder=${this.msg('Select a port')}
                        value=${selected?.toString() ?? ''}
                        @sl-change=${(e: SlChangeEvent) => {
                            const port = parseInt((e.target as SlSelect).value as string);
                            if (Number.isNaN(port)) {
                                this.selectedPorts[side].connectionType = null;
                                this.selectedPorts[side].port = null;
                            } else {
                                this.selectedPorts[side].connectionType = node.portData.get(port)!.get('Connection Type');
                                this.selectedPorts[side].port = port;
                            }
                            if (this.selectedPorts['source'].port && this.selectedPorts['target'].port)
                                updatePortLink.bind(this)();
                            this.requestUpdate();
                        }}
                    >
                        <span slot="prefix"><sl-icon src=${iconCpu}></sl-icon></span>
                        ${availablePorts.map((port) => {
                            const portData = node.portData.get(port)!;

                            return html`
                                <sl-option
                                    value=${String(port)}
                                    ?disabled=${this.selectedPorts[other].connectionType &&
                                    this.selectedPorts[other].connectionType !== portData.get('Connection Type')}
                                >
                                    <span slot="prefix"
                                        ><sl-icon src=${portData.get('Connection Type') === 'ethernet' ? iconNetwork : iconWifi}></sl-icon></span
                                    >
                                    <span slot="suffix" class="endpoint__mac">
                                        ${`MAC: ${portData.get('MAC').address}`}
                                    </span>
                                    ${portData.get('Name') || port}
                                </sl-option>
                            `;
                        })}
                    </sl-select>
                    ${availablePorts.length === 0
                        ? html`<p class="configdrawer__empty">${this.msg('No port available.')}</p>`
                        : ''}
                </div>
            </section>
        `;
    };

    return html`
        <sl-drawer
            id="edgeConfigDrawer"
            class="configdrawer"
            contained
            placement="end"
            @keydown=${handleDrawerKeydown}
            label=${this.msg('Interfaces of the connection')}
            @sl-after-hide=${() => this.requestUpdate()}
        >
            <div class="configdrawer__stack">
                ${endpointTemplate(source, 'source', availableSourcePorts, edge.inPort, this.msg('Source'))}
                <sl-divider class="endpoint__link" style=${`--color: ${edge.color}`}></sl-divider>
                ${endpointTemplate(target, 'target', availableTargetPorts, edge.outPort, this.msg('Target'))}
            </div>
        </sl-drawer>
    `;
}

function networkConfigDrawerTemplate(this: WwNetwork) {
    const network = this.selectedObject as Net;

    /** Applies the outcome of a change of the net's address settings to its input and to the saved data. */
    const settle = (input: SlInput, success: boolean, problem: string) => {
        fieldState(input, success, problem);
        if (success) this.apply();
    };

    return html`
        <sl-drawer
            id="networkConfigDrawer"
            class="configdrawer"
            contained
            placement="end"
            @keydown=${handleDrawerKeydown}
            label=${this.msg('Details of the network ') + (network?.id ?? '')}
            @sl-after-hide=${() => this.requestUpdate()}
        >
            <div class="configdrawer__fields">
                <sl-input
                    size="small"
                    type="text"
                    label="NetID"
                    placeholder="0.0.0.0"
                    spellcheck="false"
                    value=${network?.networkAddress?.address}
                    @sl-input=${(e: SlChangeEvent) => {
                        const input = e.target as SlInput;
                        const subnet = this.selectedObject as Net;

                        if (Ipv4Address.validateAddress(input.value, this.diagram.ipv4Database) == null) {
                            fieldState(input, false, this.msg('IPv4 address is invalid.'));
                            return;
                        }
                        fieldState(input, true);

                        const success = subnet.handleChangesOnNewNetInfo(input.value, subnet.netmask, subnet.bitmask, this.diagram);
                        settle(input, success, this.msg('Invalid net id.'));
                    }}
                ></sl-input>

                <sl-divider></sl-divider>

                <sl-input
                    size="small"
                    type="text"
                    label=${this.msg('Network Mask')}
                    placeholder="255.255.255.0"
                    spellcheck="false"
                    id="netmask"
                    value=${network?.netmask}
                    @sl-input=${(e: SlChangeEvent) => {
                        const input = e.target as SlInput;
                        const subnet = this.selectedObject as Net;

                        if (Ipv4Address.validateAddress(input.value, this.diagram.ipv4Database) == null) {
                            fieldState(input, false, this.msg('IPv4 address is invalid.'));
                            return;
                        }
                        fieldState(input, true);

                        const success = subnet.handleChangesOnNewNetInfo(
                            subnet.networkAddress.address,
                            input.value,
                            subnet.bitmask,
                            this.diagram
                        );
                        settle(input, success, this.msg('Invalid netmask.'));
                        if (success) {
                            const bitmask = (
                                AddressingHelper.decimalStringWithDotToBinary(input.value).match(new RegExp('1', 'g')) || []
                            ).length;
                            this.shadowRoot?.querySelector('#bitmask')?.setAttribute('value', bitmask.toString());
                        }
                    }}
                ></sl-input>

                <sl-divider></sl-divider>

                <sl-input
                    size="small"
                    type="number"
                    max="32"
                    min="0"
                    label=${this.msg('Bitmask')}
                    placeholder=${this.msg('Bitmask')}
                    id="bitmask"
                    value=${network?.bitmask}
                    @sl-change=${(e: SlChangeEvent) => {
                        const input = e.target as SlInput;
                        const value = parseInt(input.value);
                        const subnet = this.selectedObject as Net;

                        const netmask = AddressingHelper.binaryToDecimalOctets(''.padStart(value, '1').padEnd(32, '0'));

                        const success = subnet.handleChangesOnNewNetInfo(
                            subnet.networkAddress.address,
                            netmask.join('.'),
                            value,
                            this.diagram
                        );

                        this.shadowRoot?.querySelector('#netmask')?.setAttribute('value', netmask.join('.'));
                        settle(input, success, this.msg('Invalid bitmask.'));
                    }}
                ></sl-input>
            </div>
        </sl-drawer>
    `;
}

function handleMacAddressChange(this: WwNetwork, node: PhysicalNode, index: number, e: SlChangeEvent) {
    const input = e.target as SlInput;
    const mac = MacAddress.validateAddress(input.value, this.diagram.macDatabase);

    if (mac != null) {
        MacAddress.removeAddressFromDatabase(node.portData.get(index)!.get('MAC'), this.diagram.macDatabase);
        this.apply(() => node.portData.get(index)!.set('MAC', mac));
        MacAddress.addAddressToDatabase(mac, this.diagram.macDatabase, node.id);
        fieldState(input, true);
    } else {
        fieldState(input, false, this.msg('MAC address is invalid.'));
    }
}

function handleIPv4AddressChange(this: WwNetwork, node: PhysicalNode, index: number, e: SlChangeEvent) {
    const input = e.target as SlInput;
    const ipv4 = Ipv4Address.validateAddress(input.value, this.diagram.ipv4Database);
    const subnet = this.diagram.netOf(node.id);
    const gateway: boolean = node.has('gateway-node');

    if (ipv4 == null) {
        fieldState(input, false, this.msg('IPv4 address is invalid.'));
        return;
    }

    if (subnet != null && this.diagram.subnettingMode == 'HOST_BASED') {
        Net.calculateCIDRGivenNewHost(subnet, ipv4, this.diagram.ipv4Database, this.diagram);
    }
    if (subnet != null && this.diagram.subnettingMode == 'NET_BASED' && !ipv4.matchesNetworkCidr(subnet)) {
        fieldState(input, false, this.msg("Inserted IPv4 doesn't match the subnet mask."));
        return;
    }

    if (gateway) {
        const affectedNetwork: Net | undefined = (node as Router).portNetMapping.get(index);

        if (this.diagram.subnettingMode == 'HOST_BASED' && affectedNetwork) {
            Net.calculateCIDRGivenNewHost(affectedNetwork, ipv4, this.diagram.ipv4Database, this.diagram);
        }

        if (this.diagram.subnettingMode == 'NET_BASED' && affectedNetwork && !ipv4.matchesNetworkCidr(affectedNetwork)) {
            fieldState(
                input,
                false,
                this.msg("Inserted IPv4 for gateway doesn't match the subnet mask or the network is not configured.")
            );
            return;
        }
    }

    Ipv4Address.removeAddressFromDatabase(node.portData.get(index)!.get('IPv4'), this.diagram.ipv4Database);
    this.apply(() => node.portData.get(index)!.set('IPv4', ipv4));
    Ipv4Address.addAddressToDatabase(ipv4, this.diagram.ipv4Database, node.id);
    fieldState(input, true);
}

function handleIPv6AddressChange(this: WwNetwork, node: PhysicalNode, index: number, e: SlChangeEvent) {
    const input = e.target as SlInput;
    const ipv6 = Ipv6Address.validateAddress(input.value, this.diagram.ipv6Database);

    if (ipv6 != null) {
        Ipv6Address.removeAddressFromDatabase(node.portData.get(index)!.get('IPv6'), this.diagram.ipv6Database);
        this.apply(() => node.portData.get(index)!.set('IPv6', ipv6));
        Ipv6Address.addAddressToDatabase(ipv6, this.diagram.ipv6Database, node.id);
        fieldState(input, true);
    } else {
        fieldState(input, false, this.msg('IPv6 address is invalid.'));
    }
}

function addPort(this: WwNetwork, node: PhysicalNode) {
    const portInfo = new Map();
    if (node.has('access-point-node') || node.has('switch-node') || node.has('bridge-node')) {
        portInfo.set('MAC', MacAddress.generateRandomAddress(this.diagram.macDatabase));
    }

    if (node.has('bridge-node') || node.has('repeater-node')) {
        portInfo.set('Connection Type', 'ethernet');
    }

    if (node.has('router-node') || node.has('host-node')) {
        const takenNames = new Set([...node.portData.values()].map((port) => port.get('Name')));
        let nameNumber = node.portData.size + 1;
        while (takenNames.has('port-' + nameNumber)) nameNumber++;

        portInfo.set('MAC', MacAddress.generateRandomAddress(this.diagram.macDatabase));
        portInfo.set('IPv4', Ipv4Address.getLoopBackAddress());
        portInfo.set('IPv6', Ipv6Address.getLoopBackAddress());
        portInfo.set('Name', 'port-' + nameNumber);
        portInfo.set('Connection Type', 'ethernet');
    }

    this.apply(() => {
        node.portData.set(node.portData.size + 1, portInfo);
        node.portLinkMapping.set(node.portLinkMapping.size + 1, null!);
        node.numberOfInterfacesOrPorts = node.numberOfInterfacesOrPorts + 1;
    });
}

function removePort(this: WwNetwork, node: PhysicalNode, index: number) {
    if (isPortConnected.bind(this)(node, index)) {
        this.diagram.notify('warning', '', this.msg('Disconnect the port to remove it.'));
        return;
    }

    const ipv4 = node.portData.get(index)!.get('IPv4');
    if (ipv4 != null) Ipv4Address.removeAddressFromDatabase(ipv4, this.diagram.ipv4Database);

    const ipv6 = node.portData.get(index)!.get('IPv6');
    if (ipv6 != null) Ipv6Address.removeAddressFromDatabase(ipv6, this.diagram.ipv6Database);

    const mac = node.portData.get(index)!.get('MAC');
    if (mac != null) MacAddress.removeAddressFromDatabase(mac, this.diagram.macDatabase);

    this.apply(() => {
        node.portData.delete(index);
        node.portLinkMapping.delete(index);
        (node as Router).portNetMapping?.delete(index);

        compactPortNumbers.call(this, node);

        node.numberOfInterfacesOrPorts = node.portData.size;
    });
}

function compactPortNumbers(this: WwNetwork, node: PhysicalNode): void {
    const renumber = new Map<number, number>();
    let next = 1;
    for (const port of node.portData.keys()) renumber.set(Number(port), next++);
    if ([...renumber].every(([from, to]) => from === to)) return;

    const shifted = (port: any): number | undefined => {
        const to = renumber.get(Number(port));
        return to !== undefined && to !== Number(port) ? to : undefined;
    };
    const rekey = (map: Map<any, any> | undefined) => {
        if (!map) return;
        const entries = [...map.entries()];
        map.clear();
        entries.forEach(([port, value]) => {
            const to = renumber.get(Number(port));
            if (to !== undefined) map.set(to, value);
        });
    };

    //the port maps first: edge labels read them as soon as an edge's port number changes
    rekey(node.portData);
    rekey(node.portLinkMapping);
    rekey((node as Router).portNetMapping);

    //connections
    this.diagram.edgesOf(node.id).forEach((edge) => {
        if (edge.source === node.id) {
            const to = shifted(edge.inPort);
            if (to !== undefined) edge.inPort = to;
        }
        if (edge.target === node.id) {
            const to = shifted(edge.outPort);
            if (to !== undefined) edge.outPort = to;
        }
    });

    //gateway assignments referring to one of this router's ports
    const id = node.id;
    this.diagram.nets().forEach((net) => {
        const gatewayTo = net.gateways.has(id) ? shifted(net.gateways.get(id)) : undefined;
        if (gatewayTo !== undefined) net.gateways.set(id, gatewayTo);

        const current = net.currentDefaultGateway;
        const currentTo = current?.[0] === id ? shifted(current[1]) : undefined;
        if (currentTo !== undefined) net.currentDefaultGateway = [id, currentTo];
    });
    this.diagram.physicalNodes().forEach((other) => {
        const gateway = other.defaultGateway;
        const to = gateway?.[0] === id ? shifted(gateway[1]) : undefined;
        if (to !== undefined) other.defaultGateway = [id, to];
    });
}

function updatePortLink(this: WwNetwork) {
    const edge = this.selectedObject as GraphEdge;
    const inPort = this.selectedPorts['source'].port || 0;
    const outPort = this.selectedPorts['target'].port || 0;

    this.apply(() => {
        GraphEdge.addPorts(edge, inPort, outPort, this.diagram);
        setUpGateway(this.diagram, edge.source, edge.target, inPort);
        setUpGateway(this.diagram, edge.target, edge.source, outPort);
    });
}

function isPortConnected(this: WwNetwork, node: PhysicalNode, port: number): boolean {
    //ask the edges: portLinkMapping holds '' for ports that were never linked
    return this.diagram
        .edgesOf(node.id)
        .some(
            (edge) =>
                (edge.source === node.id && Number(edge.inPort) === Number(port)) ||
                (edge.target === node.id && Number(edge.outPort) === Number(port))
        );
}

function nodeRoutingTableTemplate(this: WwNetwork): TemplateResult {
    const node = this.selectedObject!;
    const { arpTable, routingTable, macAddressTable } = tablesOf(node);
    const tables: { name: string; label: string; columns: string[]; rows: (string | number)[][] }[] = [];

    if (arpTable?.size) {
        tables.push({
            name: 'arp',
            label: this.msg('ARP Table'),
            columns: ['IP', 'MAC'],
            rows: Array.from(arpTable.entries()),
        });
    }
    if (routingTable?.size) {
        tables.push({
            name: 'routing',
            label: this.msg('Routing Table'),
            columns: [this.msg('Net'), this.msg('Gateway')],
            rows: Array.from(routingTable, ([destination, route]) => [destination, route.gateway]),
        });
    }
    if (macAddressTable?.size) {
        tables.push({
            name: 'mac',
            label: this.msg('Mac Address Table'),
            columns: ['MAC', this.msg('Port')],
            rows: Array.from(macAddressTable.entries()),
        });
    }

    // A different node can expose different tabs. Recreate the group so its first tab is selected.
    return html`${keyed((node as GraphNode).id, html`
        <sl-tab-group>
            ${tables.map((table) => html`<sl-tab slot="nav" panel=${table.name}>${table.label}</sl-tab>`)}
            ${tables.map((table) => html`
                <sl-tab-panel name=${table.name}>
                        <table aria-label=${table.label}>
                            <thead>
                                <tr>${table.columns.map((column) => html`<th scope="col">${column}</th>`)}</tr>
                            </thead>
                            <tbody>
                                ${table.rows.map((row) => html`<tr>${row.map((value) => html`<td>${value}</td>`)}</tr>`)}
                            </tbody>
                        </table>
                </sl-tab-panel>
            `)}
        </sl-tab-group>
    `)}`;
}
