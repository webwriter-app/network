import SlColorPicker from '@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js';
import SlDrawer from '@shoelace-style/shoelace/dist/components/drawer/drawer.component.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.component.js';
import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import type SlMenuItem from '@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js';
import type SlMenu from '@shoelace-style/shoelace/dist/components/menu/menu.component.js';
import { SlChangeEvent } from '@shoelace-style/shoelace';
import { html, nothing, TemplateResult } from 'lit';
import { NetworkComponent } from 'src';
import { Ipv4Address } from '../adressing/Ipv4Address';
import { Ipv6Address } from '../adressing/Ipv6Address';
import { MacAddress } from '../adressing/MacAddress';
import { Net } from '../components/logicalNodes/Net';
import { Router } from '../components/physicalNodes/Connector';
import { GraphNodeFactory } from '../event-handlers/component-manipulation';
import { biAlphabet, biDiagram3, biEthernet, biPCICardNetwork, biPencil, biPlusSquare, biRouter, biTrash, biWifi } from '../styles/icons';
import { EdgeController } from '../event-handlers/edge-controller';

import { styleMap } from 'lit/directives/style-map.js';
import { keyed } from 'lit/directives/keyed.js';
import { GraphEdge } from '../components/GraphEdge';
import { AlertHelper } from '../utils/AlertHelper';
import { AddressingHelper } from '../utils/AdressingHelper';
import { msg } from '@lit/localize';

export function hasSimulationTableEntries(node: { data(name: string): unknown }): boolean {
    return ['arpTableIpMac', 'routingTable', 'macAddressTable'].some((name) => {
        const table = node.data(name);
        return table instanceof Map && table.size > 0;
    });
}

export function contextMenuTemplate(this: NetworkComponent): TemplateResult {
    if (!this.selectedObject) return html``;

    const type = this.selectedObject?.isNode()
        ? this.selectedObject.data('cssClass').includes('net-node')
            ? 'network'
            : 'node'
        : 'edge';

    if (this.mode === 'simulate' && (type !== 'node' || !hasSimulationTableEntries(this.selectedObject))) return html``;

    const anchorRect = this.contextMenuAnchor?.getBoundingClientRect();
    const canvasRect = this._cy?.getBoundingClientRect();
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
                    .flipBoundary=${this._cy}
                    .shiftBoundary=${this._cy}
                    .autoSizeBoundary=${this._cy}
                    @pointerdown=${(e: Event) => e.stopPropagation()}
                    @wheel=${(e: Event) => e.stopPropagation()}
                >
                    ${this.mode === 'simulate' ? html`
                        <div class="contextmenu contextmenu--tables" tabindex="-1" aria-label=${msg('Simulation tables')}>
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

function contextMenuItemsTemplate(this: NetworkComponent, type: 'node' | 'network' | 'edge'): TemplateResult {
    const color = this.selectedObject.data('color') || '#ffffff';
    return html`
        ${type === 'node' ? html`
            <sl-menu-item value="rename" aria-label=${msg('Name')}>
                <span slot="prefix" aria-hidden="true">${biAlphabet}</span>
                <sl-input
                    class="contextmenu__name"
                    size="small"
                    aria-label=${msg('Name')}
                    placeholder=${msg('Name')}
                    .value=${this.selectedObject.data('name') ?? ''}
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
                        this.selectedObject.data('name', (e.target as SlInput).value);
                    }}
                ></sl-input>
            </sl-menu-item>
            <sl-divider></sl-divider>
        ` : nothing}
        <sl-menu-item value=${type + '-config'}>
            <span slot="prefix" aria-hidden="true">${type === 'network' ? biDiagram3 : biEthernet}</span>
            ${type === 'network' ? msg('Define Network') : type === 'node' ? msg('Change Port Config') : msg('Define Interfaces')}
        </sl-menu-item>
        <sl-menu-item id="contextMenuColor" value="color" aria-haspopup="dialog" aria-expanded=${this.contextMenuColorOpen}>
            <span slot="prefix" aria-hidden="true">${biPencil}</span>
            ${msg('Change color')}
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
            <span slot="prefix" aria-hidden="true">${biTrash}</span>
            ${msg('Delete')}
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

function gatewayMenuItemTemplate(this: NetworkComponent, type: 'node' | 'network' | 'edge'): TemplateResult {
    const node = this.selectedObject;
    const isHost = type === 'node' && node.hasClass('host-node') && node.isChild();
    const gateways: Map<string, number> | undefined = type === 'network'
        ? node.data('gateways')
        : isHost ? node.parent().data('gateways') : undefined;
    if (!gateways?.size) return html``;
    const dataKey = type === 'network' ? 'currentDefaultGateway' : 'defaultGateway';

    return html`
        <sl-menu-item value="gateway" aria-label=${msg('Default Gateway')}>
            <span slot="prefix" aria-hidden="true">${biRouter}</span>
            <sl-select
                class="contextmenu__gateway"
                size="small"
                hoist
                aria-label=${msg('Default Gateway')}
                placeholder=${msg('Default Gateway')}
                .value=${node.data(dataKey)?.[0] ?? ''}
                @click=${stopMenuControlEvent}
                @mousedown=${stopMenuControlEvent}
                @mouseover=${stopMenuControlEvent}
                @focusin=${setCurrentMenuControl}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key !== 'Escape') e.stopPropagation();
                }}
                @sl-change=${(e: Event) => {
                    const gateway = (e.target as SlSelect).value as string;
                    node.data(dataKey, [gateway, gateways.get(gateway)]);
                }}
            >
                ${Array.from(gateways.keys()).map((key) => html`<sl-option value=${key}>${key}</sl-option>`)}
            </sl-select>
        </sl-menu-item>
    `;
}

async function handleContextMenuSelect(this: NetworkComponent, e: CustomEvent<{ item: SlMenuItem }>): Promise<void> {
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
            if (this.selectedObject.isNode()) {
                GraphNodeFactory.removeNode(this.selectedObject, this);
            } else {
                EdgeController.removeConnection(this.selectedObject.data(), this._graph);
            }
            this.selectedObject.remove();
            this.closeContextMenu(true);
            break;
    }
}

function colorPanelTemplate(this: NetworkComponent): TemplateResult {
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
            .flipBoundary=${this._cy}
            .shiftBoundary=${this._cy}
            .autoSizeBoundary=${this._cy}
        >
            <div class="contextmenu__color-panel" role="dialog" aria-label=${msg('Change color')}>
                <sl-color-picker
                    id="contextMenuColorPicker"
                    inline
                    label=${msg('Change color')}
                    .swatches=${this.colors}
                    .value=${this.selectedObject.data('color') || '#ffffff'}
                    @sl-change=${(e: Event) => {
                        this.selectedObject.data('color', (e.target as SlColorPicker).value);
                        this.requestUpdate();
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

function openConfigDrawer(this: NetworkComponent, selector: string) {
    this.closeContextMenu();
    (this.shadowRoot?.querySelector(selector) as SlDrawer | null)?.show();
}

function nodeConfigDrawerTemplate(this: NetworkComponent) {
    const node: any = this.selectedObject;
    const ports: Map<string, Map<string, any>> = node?.data('portData');
    const entries = ports ? Array.from(ports.entries()) : [];

    return html`
        <sl-drawer
            id="nodeConfigDrawer"
            class="configdrawer"
            contained
            placement="end"
            @keydown=${handleDrawerKeydown}
            label=${msg('Ports of ') + (node?.data('name') ?? '')}
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
                                              >${port.get('Name') || msg('Port') + ' ' + (position + 1)}</span
                                          >
                                          <sl-button
                                              class="portcard__remove"
                                              size="small"
                                              circle
                                              title=${msg('Remove Port')}
                                              @keydown=${(e: KeyboardEvent) => e.stopPropagation()}
                                              @click=${(e: MouseEvent) => {
                                                  e.stopPropagation();
                                                  removePort.bind(this)(node, index);
                                              }}
                                              >${biTrash}</sl-button
                                          >
                                      </div>

                                      <div class="configdrawer__fields">
                                          ${port.has('Name')
                                              ? html`<sl-input
                                                    size="small"
                                                    label=${msg('Name')}
                                                    placeholder=${msg('Name')}
                                                    spellcheck="false"
                                                    value=${port.get('Name') ?? ''}
                                                    @sl-input=${(e: SlChangeEvent) => {
                                                        const v = (e.target as SlInput).value;
                                                        const portData = node.data('portData');
                                                        portData.get(index).set('Name', v);
                                                        node.data('portData', portData);
                                                    }}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('Connection Type')
                                              ? html`<sl-select
                                                    size="small"
                                                    hoist
                                                    label=${msg('Connection Type')}
                                                    help-text=${connected
                                                        ? msg('Disconnect the port to change its type.')
                                                        : ''}
                                                    value=${port.get('Connection Type')}
                                                    ?disabled=${connected}
                                                    @sl-change=${handlePortTypeChangeGenerator
                                                        .bind(this)(index)
                                                        .bind(this)}
                                                >
                                                    <span slot="prefix"
                                                        >${port.get('Connection Type') === 'wireless'
                                                            ? biWifi
                                                            : biEthernet}</span
                                                    >
                                                    <sl-option value="ethernet">${msg('Ethernet')}</sl-option>
                                                    <sl-option value="wireless">${msg('Wireless')}</sl-option>
                                                </sl-select>`
                                              : ''}
                                          ${port.has('MAC')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="MAC"
                                                    placeholder="FF:FF:FF:FF:FF:FF"
                                                    spellcheck="false"
                                                    value=${port.get('MAC')?.address ?? ''}
                                                    @sl-input=${handleMacAddressChangeGenerator
                                                        .bind(this)(index)
                                                        .bind(this)}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('IPv4')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="IPv4"
                                                    placeholder="0.0.0.0"
                                                    spellcheck="false"
                                                    value=${port.get('IPv4')?.address ?? ''}
                                                    @sl-input=${handleIPv4AddressChangeGenerator
                                                        .bind(this)(index)
                                                        .bind(this)}
                                                ></sl-input>`
                                              : ''}
                                          ${port.has('IPv6')
                                              ? html`<sl-input
                                                    size="small"
                                                    label="IPv6"
                                                    placeholder="::"
                                                    spellcheck="false"
                                                    value=${port.get('IPv6')?.address ?? ''}
                                                    @sl-input=${handleIPv6AddressChangeGenerator
                                                        .bind(this)(index)
                                                        .bind(this)}
                                                ></sl-input>`
                                              : ''}
                                      </div>
                                  </sl-details>
                              `;
                          })}
                      </div>
                  `
                : html`<p class="configdrawer__empty">${msg('No port available.')}</p>`}

            <sl-button slot="footer" size="small" variant="primary" @click=${addPort.bind(this, node)}>
                <span slot="prefix">${biPlusSquare}</span>
                ${msg('Add Port')}
            </sl-button>
        </sl-drawer>
    `;
}

function edgeConfigDrawerTemplate(this: NetworkComponent) {
    const edge: any = this.selectedObject;

    if (!edge) return html``;

    const source: any = edge.source();
    const target: any = edge.target();

    const availableSourcePorts: number[] = [];
    const availableTargetPorts: number[] = [];

    source.data('portLinkMapping').forEach((link: any, port: any) => {
        if (link == null || link == undefined || link == '' || link === edge.data('id')) {
            availableSourcePorts.push(port);
        }
    });
    target.data('portLinkMapping').forEach((link: any, port: any) => {
        if (link == null || link == undefined || link == '' || link === edge.data('id')) {
            availableTargetPorts.push(port);
        }
    });

    const endpointTemplate = (
        node: any,
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
                            backgroundColor: node.data('color'),
                            backgroundImage: `url("${node.data('backgroundPath')}")`,
                        })}
                    ></div>
                    <div class="endpoint__names">
                        <span class="endpoint__role">${role}</span>
                        <span class="endpoint__title">${node.data('name')}</span>
                    </div>
                </header>

                <div class="configdrawer__fields">
                    <sl-select
                        size="small"
                        hoist
                        clearable
                        label=${msg('Port')}
                        placeholder=${msg('Select a port')}
                        value=${selected?.toString() ?? ''}
                        @sl-change=${(e: SlChangeEvent) => {
                            const port = parseInt((e.target as SlSelect).value as string);
                            if (Number.isNaN(port)) {
                                this.selectedPorts[side].connectionType = null;
                                this.selectedPorts[side].port = null;
                            } else {
                                const cv = node.data('portData').get(port).get('Connection Type');
                                this.selectedPorts[side].connectionType = cv;
                                this.selectedPorts[side].port = port;
                            }
                            if (this.selectedPorts['source'].port && this.selectedPorts['target'].port)
                                updatePortLink.bind(this)();
                            this.requestUpdate();
                        }}
                    >
                        <span slot="prefix">${biPCICardNetwork}</span>
                        ${availablePorts.map((port) => {
                            const portData = node.data('portData').get(port);

                            return html`
                                <sl-option
                                    value=${port}
                                    ?disabled=${this.selectedPorts[other].connectionType &&
                                    this.selectedPorts[other].connectionType !== portData.get('Connection Type')}
                                    ?selected=${port === selected}
                                >
                                    <span slot="prefix"
                                        >${portData.get('Connection Type') === 'ethernet' ? biEthernet : biWifi}</span
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
                        ? html`<p class="configdrawer__empty">${msg('No port available.')}</p>`
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
            label=${msg('Interfaces of the connection')}
            @sl-after-hide=${() => this.requestUpdate()}
        >
            <div class="configdrawer__stack">
                ${endpointTemplate(source, 'source', availableSourcePorts, edge.data('inPort'), msg('Source'))}
                <sl-divider class="endpoint__link" style=${`--color: ${edge.data('color')}`}></sl-divider>
                ${endpointTemplate(target, 'target', availableTargetPorts, edge.data('outPort'), msg('Target'))}
            </div>
        </sl-drawer>
    `;
}

function networkConfigDrawerTemplate(this: NetworkComponent) {
    const network: any = this.selectedObject;

    return html`
        <sl-drawer
            id="networkConfigDrawer"
            class="configdrawer"
            contained
            placement="end"
            @keydown=${handleDrawerKeydown}
            label=${msg('Details of the network ') + (network?.data('id') ?? '')}
            @sl-after-hide=${() => this.requestUpdate()}
        >
            <div class="configdrawer__fields">
                <sl-input
                    size="small"
                    type="text"
                    label="NetID"
                    placeholder="0.0.0.0"
                    spellcheck="false"
                    value=${network?.data('networkAddress')?.address}
                    @sl-input=${(e: SlChangeEvent) => {
                        const value = (e.target as SlInput).value;
                        const subnet: Net = this.selectedObject.data();

                        if (Ipv4Address.validateAddress(value, this.ipv4Database) == null) {
                            (e.target as SlInput).classList.add('danger');
                            (e.target as SlInput).classList.remove('success');
                            (e.target as SlInput).setAttribute('help-text', msg('IPv4 address is invalid.'));
                            return;
                        } else {
                            (e.target as SlInput).classList.remove('danger');
                            (e.target as SlInput).classList.add('success');
                            (e.target as SlInput).setAttribute('help-text', '');
                        }

                        const success = subnet.handleChangesOnNewNetInfo(value, subnet.netmask, subnet.bitmask, this);
                        if (success) {
                            this.selectedObject.toggleClass('unconfigured-net', false);

                            const name = this.selectedObject.data('name');
                            this.selectedObject.data('name', name);
                        } else {
                            (e.target as SlInput).classList.add('danger');
                            (e.target as SlInput).classList.remove('success');
                            (e.target as SlInput).setAttribute('help-text', msg('Invalid net id.'));
                        }
                    }}
                ></sl-input>

                <sl-divider></sl-divider>

                <sl-input
                    size="small"
                    type="text"
                    label=${msg('Network Mask')}
                    placeholder="255.255.255.0"
                    spellcheck="false"
                    id="netmask"
                    value=${network?.data('netmask')}
                    @sl-input=${(e: SlChangeEvent) => {
                        const value = (e.target as SlInput).value;
                        const subnet: Net = this.selectedObject.data();

                        if (Ipv4Address.validateAddress(value, this.ipv4Database) == null) {
                            (e.target as SlInput).classList.add('danger');
                            (e.target as SlInput).classList.remove('success');
                            (e.target as SlInput).setAttribute('help-text', msg('IPv4 address is invalid.'));
                            return;
                        } else {
                            (e.target as SlInput).classList.remove('danger');
                            (e.target as SlInput).classList.add('success');
                            (e.target as SlInput).setAttribute('help-text', '');
                        }

                        const success = subnet.handleChangesOnNewNetInfo(
                            subnet.networkAddress.address,
                            value,
                            subnet.bitmask,
                            this
                        );
                        if (success) {
                            this.selectedObject.toggleClass('unconfigured-net', false);

                            const name = this.selectedObject.data('name');
                            this.selectedObject.data('name', name);

                            const bitmask = (
                                AddressingHelper.decimalStringWithDotToBinary(value).match(new RegExp('1', 'g')) || []
                            ).length;
                            this.shadowRoot?.querySelector('#bitmask')?.setAttribute('value', bitmask.toString());
                        } else {
                            (e.target as SlInput).classList.add('danger');
                            (e.target as SlInput).classList.remove('success');
                            (e.target as SlInput).setAttribute('help-text', msg('Invalid netmask.'));
                        }
                    }}
                ></sl-input>

                <sl-divider></sl-divider>

                <sl-input
                    size="small"
                    type="number"
                    max="32"
                    min="0"
                    label=${msg('Bitmask')}
                    placeholder=${msg('Bitmask')}
                    id="bitmask"
                    value=${network?.data('bitmask')}
                    @sl-change=${(e: SlChangeEvent) => {
                        const value = parseInt((e.target as SlInput).value);
                        const subnet: Net = this.selectedObject.data();

                        const netmask = AddressingHelper.binaryToDecimalOctets(''.padStart(value, '1').padEnd(32, '0'));

                        const success = subnet.handleChangesOnNewNetInfo(
                            subnet.networkAddress.address,
                            netmask.join('.'),
                            value,
                            this
                        );

                        this.shadowRoot?.querySelector('#netmask')?.setAttribute('value', netmask.join('.'));

                        if (success) {
                            this.selectedObject.toggleClass('unconfigured-net', false);

                            const name = this.selectedObject.data('name');
                            this.selectedObject.data('name', name);

                            (e.target as SlInput).classList.remove('danger');
                            (e.target as SlInput).classList.add('success');
                            (e.target as SlInput).setAttribute('help-text', '');
                        } else {
                            (e.target as SlInput).classList.add('danger');
                            (e.target as SlInput).classList.remove('success');
                            (e.target as SlInput).setAttribute('help-text', msg('Invalid bitmask.'));
                        }
                    }}
                ></sl-input>
            </div>
        </sl-drawer>
    `;
}

function handleMacAddressChangeGenerator(this: NetworkComponent, index: string) {
    return function handleMacAddressChange(this: NetworkComponent, e: SlChangeEvent) {
        const v = (e.target as SlInput).value;
        const mac = MacAddress.validateAddress(v, this.macDatabase);

        if (mac != null) {
            MacAddress.removeAddressFromDatabase(
                this.selectedObject.data('portData').get(index).get('MAC'),
                this.macDatabase
            );
            const portData = this.selectedObject.data('portData');
            portData.get(index).set('MAC', mac);
            this.selectedObject.data('portData', portData);
            MacAddress.addAddressToDatabase(mac, this.macDatabase, this.selectedObject.id);
            (e.target as SlInput).classList.remove('danger');
            (e.target as SlInput).classList.add('success');
            (e.target as SlInput).setAttribute('help-text', '');
        } else {
            (e.target as SlInput).classList.add('danger');
            (e.target as SlInput).classList.remove('success');
            (e.target as SlInput).setAttribute('help-text', msg('MAC address is invalid.'));
        }
    };
}

function handleIPv4AddressChangeGenerator(this: NetworkComponent, index: string) {
    const subnet = this.selectedObject.isChild() ? this.selectedObject.parent().data() : null;
    const gateway: boolean = this.selectedObject.hasClass('gateway-node');

    return function handleIPv4AddressChange(this: NetworkComponent, e: SlChangeEvent) {
        const v = (e.target as SlInput).value;
        const ipv4 = Ipv4Address.validateAddress(v, this.ipv4Database);

        if (ipv4 != null) {
            if (subnet != null && this.subnettingMode == 'HOST_BASED') {
                Net.calculateCIDRGivenNewHost(subnet, ipv4, this.ipv4Database, this);
                this.selectedObject.parent().classes(subnet.cssClass);
            }
            if (subnet != null && this.subnettingMode == 'NET_BASED' && !ipv4.matchesNetworkCidr(subnet)) {
                (e.target as SlInput).classList.add('danger');
                (e.target as SlInput).classList.remove('success');
                (e.target as SlInput).setAttribute('help-text', msg("Inserted IPv4 doesn't match the subnet mask."));
                return;
            }

            if (gateway) {
                // console.log('gateway', this.selectedObject.data(), index);
                const affectedNetwork: Net | undefined = (this.selectedObject.data() as Router).portNetMapping.get(
                    parseInt(index)
                );

                if (this.subnettingMode == 'HOST_BASED' && affectedNetwork) {
                    Net.calculateCIDRGivenNewHost(affectedNetwork, ipv4, this.ipv4Database, this);
                    this._graph.$('#' + affectedNetwork.id).classes(affectedNetwork.cssClass);
                }

                if (this.subnettingMode == 'NET_BASED' && affectedNetwork && !ipv4.matchesNetworkCidr(affectedNetwork)) {
                    (e.target as SlInput).classList.add('danger');
                    (e.target as SlInput).classList.remove('success');
                    (e.target as SlInput).setAttribute(
                        'help-text',
                        msg("Inserted IPv4 for gateway doesn't match the subnet mask or the network is not configured.")
                    );
                    return;
                }
            }

            Ipv4Address.removeAddressFromDatabase(
                this.selectedObject.data('portData').get(index).get('IPv4'),
                this.ipv4Database
            );
            const portData = this.selectedObject.data('portData');
            portData.get(index).set('IPv4', ipv4);
            this.selectedObject.data('portData', portData);
            Ipv4Address.addAddressToDatabase(ipv4, this.ipv4Database, this.selectedObject.data('id'));

            (e.target as SlInput).classList.remove('danger');
            (e.target as SlInput).classList.add('success');
            (e.target as SlInput).setAttribute('help-text', '');
        } else {
            (e.target as SlInput).classList.add('danger');
            (e.target as SlInput).classList.remove('success');
            (e.target as SlInput).setAttribute('help-text', msg('IPv4 address is invalid.'));
        }
    };
}

function handleIPv6AddressChangeGenerator(this: NetworkComponent, index: string) {
    return function handleIPv6AddressChange(this: NetworkComponent, e: SlChangeEvent) {
        const v = (e.target as SlInput).value;
        const ipv6 = Ipv6Address.validateAddress(v, this.ipv6Database);

        if (ipv6 != null) {
            Ipv6Address.removeAddressFromDatabase(
                this.selectedObject.data('portData').get(index).get('IPv6'),
                this.ipv6Database
            );
            const portData = this.selectedObject.data('portData');
            portData.get(index).set('IPv6', ipv6);
            this.selectedObject.data('portData', portData);
            Ipv6Address.addAddressToDatabase(ipv6, this.ipv6Database, this.selectedObject.data('id'));
            (e.target as SlInput).classList.remove('danger');
            (e.target as SlInput).classList.add('success');
            (e.target as SlInput).setAttribute('help-text', '');
        } else {
            (e.target as SlInput).classList.add('danger');
            (e.target as SlInput).classList.remove('success');
            (e.target as SlInput).setAttribute('help-text', msg('IPv6 address is invalid.'));
        }
    };
}

function handlePortTypeChangeGenerator(this: NetworkComponent, index: string) {
    return function handlePortTypeChange(this: NetworkComponent, e: SlChangeEvent) {
        const v = (e.target as SlSelect).value;
        const portData = this.selectedObject.data('portData');
        portData.get(index).set('Connection Type', v);
        this.selectedObject.data('portData', portData);
    };
}

function addPort(this: NetworkComponent, node: any) {
    const portInfo = new Map();
    if (
        node.data('cssClass').includes('access-point-node') ||
        node.data('cssClass').includes('switch-node') ||
        node.data('cssClass').includes('bridge-node')
    ) {
        const mac = MacAddress.generateRandomAddress(this.macDatabase);

        portInfo.set('MAC', mac);
    }

    if (node.data('cssClass').includes('bridge-node') || node.data('cssClass').includes('repeater-node')) {
        portInfo.set('Connection Type', 'ethernet');
    }

    if (node.data('cssClass').includes('router-node') || node.data('cssClass').includes('host-node')) {
        const mac = MacAddress.generateRandomAddress(this.macDatabase);
        const ipv4 = Ipv4Address.getLoopBackAddress();
        const ipv6 = Ipv6Address.getLoopBackAddress();
        const name = 'port-' + (node.data('portData').size + 1);
        const connectionType = 'ethernet';

        portInfo.set('MAC', mac);
        portInfo.set('IPv4', ipv4);
        portInfo.set('IPv6', ipv6);
        portInfo.set('Name', name);
        portInfo.set('Connection Type', connectionType);
    }

    node.data('portData').set(node.data('portData').size + 1, portInfo);
    node.data('portLinkMapping').set(node.data('portLinkMapping').size + 1, null);

    node.data('numberOfInterfacesOrPorts', node.data('numberOfInterfacesOrPorts') + 1);

    this.requestUpdate();
}

function removePort(this: NetworkComponent, node: any, index: string) {
    const ipv4 = node.data('portData').get(index).get('IPv4');
    if (ipv4 != null) Ipv4Address.removeAddressFromDatabase(ipv4, this.ipv4Database);

    const ipv6 = node.data('portData').get(index).get('IPv6');
    if (ipv6 != null) Ipv6Address.removeAddressFromDatabase(ipv6, this.ipv6Database);

    const mac = node.data('portData').get(index).get('MAC');
    if (mac != null) MacAddress.removeAddressFromDatabase(mac, this.macDatabase);

    node.data('portData').delete(index);
    node.data('portLinkMapping').delete(index);

    node.data('numberOfInterfacesOrPorts', node.data('numberOfInterfacesOrPorts') - 1);

    this.requestUpdate();
}

function updatePortLink(this: NetworkComponent) {
    const edge = this.selectedObject;
    const inPort = this.selectedPorts['source'].port || 0;
    const outPort = this.selectedPorts['target'].port || 0;

    const sourceNode = edge.source().data();
    const targetNode = edge.target().data();

    const newData = configurePorts.bind(this)(edge.data(), inPort, outPort);
    console.log(newData);
    if (newData != null) {
        edge.removeClass('unconfigured-edge');
        edge.addClass(newData.cssClass);
    } //set new format-display for this connection if no error appears

    this.subnettingController.setUpGateway(
        this._graph.$('#' + sourceNode.id),
        this._graph.$('#' + targetNode.id),
        inPort,
        this.ipv4Database
    );
    this.subnettingController.setUpGateway(
        this._graph.$('#' + targetNode.id),
        this._graph.$('#' + sourceNode.id),
        outPort,
        this.ipv4Database
    );
}

function configurePorts(this: NetworkComponent, edge: GraphEdge, inPort: number, outPort: number): GraphEdge | null {
    let inPortData: Map<string, any> = edge.from.portData.get(inPort)!;
    let outPortData: Map<string, any> = edge.to.portData.get(outPort)!;

    if (inPortData.get('Connection Type') == 'wireless' && outPortData.get('Connection Type') == 'wireless') {
        edge.cssClass.push('wireless-edge');
    } else if (
        (inPortData.get('Connection Type') == 'wireless' && outPortData.get('Connection Type') == 'ethernet') ||
        (inPortData.get('Connection Type') == 'ethernet' && outPortData.get('Connection Type') == 'wireless')
    ) {
        AlertHelper.toastAlert(
            'danger',
            'exclamation-triangle',
            msg('The connection type of assigned ports are not compatible!'),
            msg('Please re-assign your ports or dismiss this connection.')
        );
        return null;
    } else {
        edge.cssClass.push('wired-edge');
    }

    edge.cssClass.push('labelled-edge');

    let index;
    if ((index = edge.cssClass.indexOf('unconfigured-edge')) > -1) edge.cssClass.splice(index, 1);

    console.log(edge);

    const nodeFrom = this._graph.getElementById(edge.source);
    const nodeTo = this._graph.getElementById(edge.target);

    const fromMap = new Map(nodeFrom.data('portLinkMapping'));
    const toMap = new Map(nodeTo.data('portLinkMapping'));

    fromMap.set(inPort, edge.id);
    toMap.set(outPort, edge.id);

    nodeFrom.data('portLinkMapping', fromMap);
    nodeTo.data('portLinkMapping', toMap);

    const netEdge = this._graph.getElementById(edge.id);

    netEdge.data('inPort', inPort);
    netEdge.data('outPort', outPort);

    return edge;

    //check if one node belongs to a net, if yes --> other node must be a router
}

function isPortConnected(this: NetworkComponent, node: any, port: string): boolean {
    return node.data('portLinkMapping').get(port) != null;
}

function nodeRoutingTableTemplate(this: NetworkComponent): TemplateResult {
    const node = this.selectedObject;
    const arpTable: Map<string, string> | undefined = node.data('arpTableIpMac');
    const routingTable: Map<string, { gateway: string }> | undefined = node.data('routingTable');
    const macAddressTable: Map<string, number> | undefined = node.data('macAddressTable');
    const tables: { name: string; label: string; columns: string[]; rows: (string | number)[][] }[] = [];

    if (arpTable?.size) {
        tables.push({
            name: 'arp',
            label: msg('ARP Table'),
            columns: ['IP', 'MAC'],
            rows: Array.from(arpTable.entries()),
        });
    }
    if (routingTable?.size) {
        tables.push({
            name: 'routing',
            label: msg('Routing Table'),
            columns: [msg('Net'), msg('Gateway')],
            rows: Array.from(routingTable, ([destination, route]) => [destination, route.gateway]),
        });
    }
    if (macAddressTable?.size) {
        tables.push({
            name: 'mac',
            label: msg('Mac Address Table'),
            columns: ['MAC', msg('Port')],
            rows: Array.from(macAddressTable.entries()),
        });
    }

    // A different node can expose different tabs. Recreate the group so its first tab is selected.
    return html`${keyed(node.id(), html`
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
