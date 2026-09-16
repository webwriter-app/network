import { html, LitElement, PropertyValueMap, TemplateResult } from 'lit';
import { LitElementWw } from '@webwriter/lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { networkStyles } from './styles/network';
import { toolboxStyles } from './styles/toolbox';
import { contextMenuStyles } from './styles/contextmenu';
import { simulationMenuStyles } from './styles/simulationmenu';

import { GraphNodeFactory } from './event-handlers/component-manipulation';
import { EdgeController } from './event-handlers/edge-controller';
import { DialogFactory } from './event-handlers/dialog-content';
import { SubnettingController } from './event-handlers/subnetting-controller';
import { Net, SubnettingMode } from './components/logicalNodes/Net';
import { PacketSimulator } from './event-handlers/packet-simulator';
import { ImportExportController } from './exporting/importExportController';

import {
    biBoxes,
    biBroadcastPin,
    biCloudArrowUp,
    biCloudCheck,
    biCloudPlus,
    biDiagram3,
    biHdd,
    biPcDisplayHorizontal,
    biPencil,
    biPerson,
    biPhone,
    biRouter,
    biShare,
    faPlus,
    iBridge,
    iHub,
    iSwitch,
    biFullscreenMaximize,
    biFullscreenMinimize,
} from './styles/icons';

import 'cytoscape-context-menus/cytoscape-context-menus.css';
import { initNetwork } from './network-config';
import { EventObject } from 'cytoscape';
import { contextMenuTemplate, hasSimulationTableEntries } from './ui/ContextMenu';

import '@shoelace-style/shoelace/dist/themes/light.css';

import SlButton from '@shoelace-style/shoelace/dist/components/button/button.component.js';
import SlDetails from '@shoelace-style/shoelace/dist/components/details/details.component.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.component.js';
import SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.component.js';
import SlTooltip from '@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js';
import SlButtonGroup from '@shoelace-style/shoelace/dist/components/button-group/button-group.component.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.component.js';
import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import SlOption from '@shoelace-style/shoelace/dist/components/option/option.component.js';
import SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.component.js';
import SlDrawer from '@shoelace-style/shoelace/dist/components/drawer/drawer.component.js';
import SlDivider from '@shoelace-style/shoelace/dist/components/divider/divider.component.js';
import SlMenu from '@shoelace-style/shoelace/dist/components/menu/menu.component.js';
import SlMenuItem from '@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js';
import SlColorPicker from '@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js';
import SlPopup, { type VirtualElement } from '@shoelace-style/shoelace/dist/components/popup/popup.component.js';
import SlTabGroup from '@shoelace-style/shoelace/dist/components/tab-group/tab-group.component.js';
import SlTab from '@shoelace-style/shoelace/dist/components/tab/tab.component.js';
import SlTabPanel from '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.component.js';

import { MacAddress } from './adressing/MacAddress';
import { simulationMenuTemplate } from './ui/SimulationMenu';
import { Component, Connection, load, Network, setupListeners } from './utils/setup';
import { SlChangeEvent } from '@shoelace-style/shoelace';
import { styleMap } from 'lit/directives/style-map.js';
import LOCALIZE from "../localization/generated";
import { localized, msg } from '@lit/localize';

/**
 * @internal
 * True when a Cytoscape event came from touch input rather than mouse or pen, so that
 * long-press handling stays exclusive to touch devices.
 */
function isTouchInput(originalEvent: Event | undefined): boolean {
    if (!originalEvent) return false;
    if (typeof TouchEvent !== 'undefined' && originalEvent instanceof TouchEvent) return true;
    return (originalEvent as PointerEvent).pointerType === 'touch';
}

/**
 * @internal
 * JSON converter for the serialized state attributes. A missing or invalid attribute yields an
 * empty array instead of `null`, e.g. when undo removes the attribute of a freshly inserted widget.
 */
const arrayAttributeConverter = {
    fromAttribute(value: string | null): unknown[] {
        try {
            return value ? JSON.parse(value) ?? [] : [];
        } catch {
            return [];
        }
    },
    toAttribute(value: unknown[]): string {
        return JSON.stringify(value);
    },
};

/** @internal Attributes holding the serialized widget state. */
const STATE_ATTRIBUTES = ['components', 'connections', 'networks'] as const;

/**
 * @summary Visualization of network topologies. Can represent different kinds of networks.
 *
 * @tag ww-network
 * @tagname ww-network
 *
 * @attr {boolean} [automate=false] - Enables automation-related UI for subnetting.
 * @attr {'small'|'medium'} [screen='medium'] - Size forwarded to Shoelace controls.
 *
 * @prop {any} [selectedObject] - The currently selected Cytoscape element (node or edge).
 * @prop {Array<Component>} [components=[]] - Serialized node list.
 * @prop {Array<Connection>} [connections=[]] - Serialized edges between components.
 * @prop {Array<Network>} [networks=[]] - Serialized logical networks.
 *
 * @csspart options - Sidebar container for import/export and controllers.
 */
@localized()
@customElement('ww-network')
export class NetworkComponent extends LitElementWw {
    /** @internal Localization bundle. */
    public localize = LOCALIZE;

    /** @internal Reference to the Cytoscape container element. */
    @query('#cy')
    accessor _cy: any;

    /** @internal Cytoscape instance. */
    _graph: any;

    /** @internal ID of the component type currently selected in the toolbox. */
    currentComponentToAdd: string = '';

    /** @internal Current color for color-picking mode. */
    currentColor: string = 'white';

    /** @internal Preset color palette for node styling. */
    colors = [
        'Plum',
        '#BAADD1',
        '#9CB6D6',
        '#9DCBD1',
        'LightSeaGreen',
        '#5FCCAB',
        '#ADE07A',
        '#E2E379',
        'Tomato',
        '#FFA6B4',
        '#FF938B',
        '#FFA07A',
        '#8A8A8A',
        '#A6A6A6',
        '#D4B6A0',
        '#C29C8D',
    ];

    /** @internal Indicates whether Cytoscape has been initialized and is available. */
    networkAvailable: Boolean = false;

    /** @internal Observes the host's size so we can detect fullscreen changes. */
    private resizeObserver?: ResizeObserver;

    /** @internal Last observed fullscreen state, used to detect changes from the ResizeObserver. */
    private wasFullscreen = false;

    /** @internal Controller handle for Cytoscape edgehandles extension. */
    _edgeHandles: any;

    /** @internal Whether edge draw mode is active. */
    drawModeOn: boolean = false;

    /** @internal Controller handle for Cytoscape context menu extension. */
    _menu: any;

    /** @internal Controller handle for Cytoscape drag-and-drop compound nodes extension. */
    _cdnd: any;

    /** @internal Whether color reset mode is active. */
    resetColorModeOn: boolean = false;

    /** @internal IPv4 address registry (address -> node id). Used during simulation/setup. */
    ipv4Database: Map<string, string> = new Map<string, string>();

    /** @internal MAC address registry (address -> node id). Used to guarantee uniqueness. */
    macDatabase: Map<string, string> = new Map<string, string>();

    /** @internal IPv6 address registry (address -> node id). */
    ipv6Database: Map<string, string> = new Map<string, string>();

    /** @internal Stateful packet simulation controller. */
    @state()
    accessor packetSimulator: PacketSimulator = new PacketSimulator(this);

    /** @internal Stateful subnetting controller. */
    @state()
    accessor subnettingController: SubnettingController = new SubnettingController(this);

    /**
     * Enables automation-related UI.
     */
    @property({ type: Boolean, reflect: true })
    accessor automate: boolean = false;

    /**
     * Controls the default size of Shoelace controls within this widget.
     */
    @property({ type: String, reflect: true })
    accessor screen: 'small' | 'medium' = 'medium';

    /**
     * The currently selected Cytoscape element (node or edge).
     */
    @property({ type: Object })
    accessor selectedObject: any;

    /** @internal Toolbox button container in the shadow root. */
    @query('#toolboxButtons')
    accessor toolboxButtons!: HTMLElement;

    /** @internal Context menu popup in the shadow root. */
    @query('#contextMenu')
    accessor contextMenu!: SlPopup | null;

    /** @internal Virtual pointer anchor; null while the context menu is closed. */
    @state()
    accessor contextMenuAnchor: VirtualElement | null = null;

    /** @internal Whether the context menu's color panel is open. */
    @state()
    accessor contextMenuColorOpen = false;

    /**
     * @internal
     * Set while a long press has just opened the context menu, so the `tap` emitted when the
     * finger lifts does not immediately close it again.
     */
    private suppressNextTapClose = false;

    /**
     * @internal
     * Edge endpoint metadata captured from the selected edge. Used by the context menu to
     * display and adjust connection type and port numbers.
     */
    @state()
    accessor selectedPorts: {
        source: {
            connectionType: 'ethernet' | 'wireless' | null;
            port: number | null;
        };
        target: {
            connectionType: 'ethernet' | 'wireless' | null;
            port: number | null;
        };
    } = {
        source: { connectionType: null, port: 0 },
        target: { connectionType: null, port: 0 },
    };

    /**
     * @internal
     * Mutex state to keep exclusive drag-and-drop modes ('subnetting' or 'gateway') mutually exclusive.
     * null means no drag-and-drop mode is active.
     */
    @state()
    accessor mutexDragAndDrop: string | null = null;

    /**
     * Serialized components (nodes). Used to populate the canvas and for export.
     */
    @property({ type: Array, reflect: true, attribute: true, converter: arrayAttributeConverter })
    accessor components: Array<Component> = [];

    /**
     * Serialized connections (edges) between components.
     */
    @property({ type: Array, reflect: true, attribute: true, converter: arrayAttributeConverter })
    accessor connections: Array<Connection> = [];

    /**
     * Serialized logical networks for subnetting and validation.
     */
    @property({ type: Array, reflect: true, attribute: true, converter: arrayAttributeConverter })
    accessor networks: Array<Network> = [];

    /**
     * @internal
     * Set while the canvas is rebuilt from the serialized state, so the graph listeners skip
     * the resulting add/remove/move/data events instead of recording them as user edits.
     */
    suspendGraphSync = false;

    /**
     * @internal
     * Set when a state attribute was changed from outside the widget.
     */
    private stateChangedExternally = false;

    /** @internal Current widget mode. 'edit' enables graph editing, 'simulate' locks nodes and runs simulations. */
    @state()
    accessor mode: 'edit' | 'simulate' = 'edit';

    /** @internal Current subnetting mode. Managed by SubnettingController/Net utilities. */
    @state()
    accessor subnettingMode: SubnettingMode = 'MANUAL';

    net_mode: SubnettingMode = 'MANUAL';

    /**
     * Component styles composed from network canvas, toolbox, context menu, and simulation menu stylesheets.
     */
    public static get styles() {
        return [networkStyles, toolboxStyles, contextMenuStyles, simulationMenuStyles];
    }

    /**
     * Shadow root options.
     */
    static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

    /**
     * Scoped element registry for Shoelace components used in the template.
     */
    public static get scopedElements() {
        return {
            'sl-button': SlButton,
            'sl-button-group': SlButtonGroup,
            'sl-details': SlDetails,
            'sl-input': SlInput,
            'sl-checkbox': SlCheckbox,
            'sl-tooltip': SlTooltip,
            'sl-alert': SlAlert,
            'sl-select': SlSelect,
            'sl-option': SlOption,
            'sl-dialog': SlDialog,
            'sl-drawer': SlDrawer,
            'sl-divider': SlDivider,
            'sl-menu': SlMenu,
            'sl-menu-item': SlMenuItem,
            'sl-color-picker': SlColorPicker,
            'sl-popup': SlPopup,
            'sl-tab-group': SlTabGroup,
            'sl-tab': SlTab,
            'sl-tab-panel': SlTabPanel,
        };
    }

    /**
     * Returns true when the host has contentEditable enabled ('' or 'true'), enabling authoring controls.
     * @internal
     */
    public isEditable(): boolean {
        return this.contentEditable === 'true' || this.contentEditable === '';
    }

    /**
     * Lit lifecycle hook: invoked after the component's DOM is first rendered.
     *
     * @param _changedProperties Map of changed properties since the last update.
     * @internal
     */
    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        initNetwork(this);

        this._graph.on('cxttap', (event: EventObject) => {
            event.preventDefault();
            void this.openContextMenuFor(event);
        });

        this._graph.on('taphold', (event: EventObject) => {
            if (!isTouchInput(event.originalEvent)) return;
            this.suppressNextTapClose = true;
            void this.openContextMenuFor(event);
        });

        this._graph.on('tapstart', () => {
            this.suppressNextTapClose = false;
        });

        this._graph.on('tap', (_event: EventObject) => {
            if (this.suppressNextTapClose) {
                this.suppressNextTapClose = false;
                return;
            }
            const t = this.selectedObject;
            this.selectedObject = null;
            this.selectedObject = t;
            this.closeContextMenu();
        });

        this._graph.on('drag', (_event: EventObject) => {
            const t = this.selectedObject;
            this.selectedObject = null;
            this.selectedObject = t;
            this.closeContextMenu();
        });

        this._graph.on('pan zoom', () => this.closeContextMenu());

        this.stateChangedExternally = false;
        load.bind(this)();
        setupListeners.bind(this)();
        window.addEventListener('scroll', this.onScroll);

        this.wasFullscreen = this.isFullscreen;
        this.resizeObserver = new ResizeObserver(() => {
            this._graph?.resize();
            const isFullscreen = this.isFullscreen;
            if (isFullscreen !== this.wasFullscreen) {
                this.wasFullscreen = isFullscreen;
                this.requestUpdate();
            }
        });
        this.resizeObserver.observe(this);
    }

    /**
     * @internal
     * Opens the context menu for the element targeted by a pointer event, anchoring it at the
     * event position. Triggered by right-click / two-finger tap (`cxttap`) and long press (`taphold`).
     */
    private async openContextMenuFor(event: EventObject): Promise<void> {
        if (event.target === this._graph) {
            this.closeContextMenu();
            return;
        }

        this.closeConfigDrawers();
        this.selectedObject = event.target;

        if (!this.selectedObject.isNode()) {
            const edge = this.selectedObject.data();

            this.selectedPorts = {
                source: { connectionType: null, port: 0 },
                target: { connectionType: null, port: 0 },
            };

            if (edge.inPort != undefined && edge.inPort != null && !Number.isNaN(edge.inPort)) {
                this.selectedPorts.source.port = edge.inPort;
                this.selectedPorts.source.connectionType = edge.from.portData
                    .get(edge.inPort)
                    .get('Connection Type');
            }

            if (edge.outPort != undefined && edge.outPort != null && !Number.isNaN(edge.outPort)) {
                this.selectedPorts.target.port = edge.outPort;
                this.selectedPorts.target.connectionType = edge.to.portData
                    .get(edge.outPort)
                    .get('Connection Type');
            }
        }

        if (
            this.mode === 'simulate' &&
            (!this.selectedObject.isNode() || this.selectedObject.hasClass('net-node') ||
                !hasSimulationTableEntries(this.selectedObject))
        ) {
            this.closeContextMenu();
            return;
        }

        const { x, y } = event.renderedPosition;
        const anchor: VirtualElement = {
            contextElement: this._cy,
            getBoundingClientRect: () => {
                const rect = this._cy.getBoundingClientRect();
                const scaleX = this._cy.clientWidth ? rect.width / this._cy.clientWidth : 1;
                const scaleY = this._cy.clientHeight ? rect.height / this._cy.clientHeight : 1;
                return new DOMRect(rect.left + x * scaleX, rect.top + y * scaleY, 0, 0);
            },
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

    /** @internal Closes the context menu, optionally returning keyboard focus to the canvas. */
    public closeContextMenu(restoreFocus = false): void {
        // A long press that ends up closing instead of opening the menu must not swallow its tap.
        this.suppressNextTapClose = false;
        this.contextMenuColorOpen = false;
        this.contextMenuAnchor = null;
        if (restoreFocus) this._cy?.focus({ preventScroll: true });
    }

    /**
     * Closes every widget-contained configuration drawer.
     * Called before a new context menu is opened so a drawer never shows stale content.
     * @internal
     */
    public closeConfigDrawers(): void {
        this.renderRoot.querySelectorAll('sl-drawer[open]').forEach((drawer) => (drawer as SlDrawer).hide());
    }

    /**
     * Lit lifecycle hook: cleanup when the element is disconnected.
     * Removes the scroll listener added in firstUpdated.
     * @internal
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('scroll', this.onScroll);
        this.resizeObserver?.disconnect();
    }

    /**
     * @internal
     * Workaround for Cytoscape's cached container bounds. Forces a resize to ensure input coordinates
     * are mapped correctly after the page scrolls.
     */
    private onScroll = () => {
        // Cytoscape caches container bounds which become outdated after scrolling.
        // Calling resize() forces Cytoscape to update its internal bounds and correctly map mouse input.
        this._graph.resize()
    }

    /**
     * Whether the editor is in fullscreen mode.
     * Uses the Fullscreen API to determine if the element itself is the fullscreen element.
     * @private
     */
    private get isFullscreen(): boolean {
        return this.ownerDocument.fullscreenElement === this;
    }

    /**
     * Toggles fullscreen mode using the Fullscreen API and requests a re-render afterwards.
     * Safely catches errors when entering fullscreen is not allowed.
     * @private
     */
    private async handleFullscreenToggle() {
        if (this.isFullscreen) {
            await this.ownerDocument.exitFullscreen();
            this.wasFullscreen = false;
            this.requestUpdate()
        } else {
            try {
                await this.requestFullscreen();
                this.wasFullscreen = true;
                this.requestUpdate()
            } catch (error) {
                console.error("Failed to enter fullscreen mode.");
            }
        }
    }

    /**
     * @internal
     * Switches between 'edit' and 'simulate'.
     *
     * Leaving the simulation rebuilds the canvas from the serialized state, because the
     * simulator replaces node data with decorators in place.
     */
    private switchMode(mode: 'edit' | 'simulate'): void {
        this.mode = mode;

        if (mode === 'simulate') {
            this._graph.$('node').lock();
            this.packetSimulator.initSession(this);
            return;
        }

        // Stop running packet animations before their nodes are removed.
        if (this.packetSimulator.inited) this.packetSimulator.stopSession(this);
        this.rebuildGraph();
    }

    /**
     * @internal
     * Replaces all canvas elements with the ones described by the serialized state.
     * The state properties themselves are left untouched, so no attribute change is emitted.
     */
    private rebuildGraph(): void {
        this.ipv4Database = new Map<string, string>(); //(address, nodeId)
        this.macDatabase = new Map<string, string>();
        this.ipv6Database = new Map<string, string>();

        this.suspendGraphSync = true;
        try {
            this._graph.elements().remove();
            load.bind(this)();
        } finally {
            this.suspendGraphSync = false;
        }
    }

    /**
     * @internal
     * Detects state attribute changes that did not originate from the widget itself.
     */
    attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
        const stateAttribute = STATE_ATTRIBUTES.find((attribute) => attribute === name);
        if (stateAttribute && value !== arrayAttributeConverter.toAttribute(this[stateAttribute])) {
            this.stateChangedExternally = true;
        }
        super.attributeChangedCallback(name, oldValue, value);
    }

    /**
     * Renders the network canvas, mode switch, toolbox, context menu and simulation menu.
     */
    public render(): TemplateResult {
        return html`
            ${this.isEditable() ? this.asideTemplate() : null}
            <div class="canvas" id="myCanvas" style="${styleMap({height: this.isFullscreen ? "100%" : "500px"})}">
                <div class="modeSwitch">
                    <sl-select
                        value=${this.mode}
                        @sl-change=${(event: Event) => {
                            this.closeContextMenu();
                            this.switchMode((event.target as HTMLSelectElement).value as 'edit' | 'simulate');
                        }}
                        size="small"
                    >
                        <span slot="prefix">${this.mode === 'edit' ? biPencil : biBoxes}</span>
                        <sl-option value="edit">${msg("Edit")}</sl-option>
                        <sl-option value="simulate">${msg("Simulate")}</sl-option>
                    </sl-select>
                </div>

                <div id="cy" tabindex="-1"></div>
                ${this.toolboxTemplate()} ${contextMenuTemplate.bind(this)()} ${simulationMenuTemplate.bind(this)()}
                
                <sl-tooltip content=${this.isFullscreen ? msg("Exit Fullscreen") : msg("Fullscreen")}>
                    <sl-button size="large" circle class="fullscreenButton" @click=${() => this.handleFullscreenToggle()}>
                        ${this.isFullscreen ? biFullscreenMinimize : biFullscreenMaximize}
                    </sl-button>
                </sl-tooltip>
            </div>

            <div id="inputDialog"></div>
            <!-- <sl-dialog id="example-graphs"> ${ImportExportController.exampleTemplate(this)} </sl-dialog> -->
            <!-- <sl-dialog id="instructions" label="${msg("Tutorials")}"> ${DialogFactory.showHelpText(this)} </sl-dialog> -->
        `;
    }

    /**
     * Renders the floating toolbox used in 'edit' mode.
     * Contains quick actions to add hosts, network devices, edges, and networks.
     * @internal
     */
    private toolboxTemplate(): TemplateResult {
        return html`
            <div class="toolbox" style=${this.mode == 'edit' ? 'display: flex;' : 'display: none;'}>
                <sl-button size="large" circle class="toolbox__open" @click=${() => this.openToolbox()}>
                    ${faPlus}
                </sl-button>

                <div class="toolbox__buttons closed" id="toolboxButtons">
                    <div class="toolbox__buttongroup">
                        <!-- <sl-tooltip content="Host" placement="left"> -->
                        <sl-button circle class="toolbox__btn" ?disabled=${this.drawModeOn}> ${biPerson} </sl-button>
                        <!-- </sl-tooltip> -->
                        <div class="toolbox__subbuttons">
                            <sl-tooltip content=${msg("Computer")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addHost().computer}>
                                    ${biPcDisplayHorizontal}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Mobile device")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addHost().mobile}>
                                    ${biPhone}
                                </sl-button>
                            </sl-tooltip>
                        </div>
                    </div>
                    <div class="toolbox__buttongroup">
                        <!-- <sl-tooltip content=${msg("Network device")} placement="left"> -->
                        <sl-button circle class="toolbox__btn" ?disabled=${this.drawModeOn}> ${biHdd} </sl-button>
                        <!-- </sl-tooltip> -->
                        <div class="toolbox__subbuttons">
                            <sl-tooltip content=${msg("Router")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().router}>
                                    ${biRouter}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Access point")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().accessPoint}>
                                    ${biBroadcastPin}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Repeater")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().repeater}>
                                    ${biHdd}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Hub")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().hub}>
                                    ${iHub}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Bridge")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().bridge}>
                                    ${iBridge}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Switch")} placement="top">
                                <sl-button circle class="toolbox__btn" @click=${this.addNetworkDevice().switch}>
                                    ${iSwitch}
                                </sl-button>
                            </sl-tooltip>
                        </div>
                    </div>
                    <div class="toolbox__buttongroup">
                        <sl-tooltip content=${msg("Edge")} placement="left">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                variant=${this.drawModeOn ? 'primary' : 'default'}
                                @click="${() => EdgeController.toggleDrawMode(this)}"
                            >
                                ${biShare}
                            </sl-button>
                        </sl-tooltip>
                    </div>
                    <div class="toolbox__buttongroup">
                        <sl-tooltip content=${msg("Network")} placement="bottom">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                ?disabled=${this.drawModeOn}
                                @click="${() => this.addNetwork()}"
                            >
                                ${biDiagram3}
                            </sl-button>
                        </sl-tooltip>

                        <div class="toolbox__subbuttons">
                            <sl-tooltip content=${msg("Network assignment")} placement="top">
                                <sl-button
                                    circle
                                    class="toolbox__btn"
                                    variant=${this.mutexDragAndDrop === 'subnetting' ? 'primary' : 'default'}
                                    @click="${(event: Event) =>
                                        this.subnettingController.toggleDragAndDropSubnetting(event, this)}"
                                >
                                    ${biCloudPlus}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Gateway assignment")} placement="top">
                                <sl-button
                                    circle
                                    class="toolbox__btn"
                                    variant=${this.mutexDragAndDrop === 'gateway' ? 'primary' : 'default'}
                                    @click="${(event: Event) =>
                                        this.subnettingController.toggleAssigningGateway(event, this)}"
                                >
                                    ${biCloudArrowUp}
                                </sl-button>
                            </sl-tooltip>
                            <sl-tooltip content=${msg("Validate global address assignments")} placement="top">
                                <sl-button
                                    circle
                                    class="toolbox__btn"
                                    @click="${() => this.subnettingController.validateAllNets(false, this)}"
                                >
                                    ${biCloudCheck}
                                </sl-button>
                            </sl-tooltip>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Toggles the visibility (collapsed/expanded) of the toolbox by switching the 'closed' CSS class.
     * @internal
     */
    private openToolbox(): void {
        this.toolboxButtons.classList.toggle('closed');
    }

    /**
     * Factory returning actions to add host components to the graph.
     * - computer(): Adds a wired computer with one ethernet interface and a unique MAC address.
     * - mobile(): Adds a wireless mobile device with one wireless interface and a unique MAC address.
     * @internal
     */
    private addHost() {
        return {
            computer: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'computer',
                    interfaces: [
                        {
                            name: 'eth0',
                            connectionType: 'ethernet',
                            mac: MacAddress.generateRandomAddress(this.macDatabase).address,
                            ipv4: '192.168.20.1',
                            ipv6: '0:0:0:0:0:0:0:1',
                        },
                    ],
                });
            },
            mobile: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'mobile',
                    interfaces: [
                        {
                            name: 'eth0',
                            connectionType: 'wireless',
                            mac: MacAddress.generateRandomAddress(this.macDatabase).address,
                            ipv4: '192.168.20.1',
                            ipv6: '0:0:0:0:0:0:0:1',
                        },
                    ],
                });
            },
        };
    }

    /**
     * Factory returning actions to add network devices to the graph:
     * - router(), accessPoint(), repeater(), hub(), bridge(), switch()
     * @internal
     */
    private addNetworkDevice() {
        return {
            router: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'router',
                    interfaces: [],
                });
            },
            accessPoint: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'access-point',
                    interfaces: [
                        { mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                        { mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                    ],
                });
            },
            repeater: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'repeater',
                    interfaces: [{ connectionType: 'ethernet' }, { connectionType: 'ethernet' }],
                });
            },
            hub: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'hub',
                    interfaces: [],
                });
            },
            bridge: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'bridge',
                    interfaces: [
                        { connectionType: 'ethernet', mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                        { connectionType: 'ethernet', mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                    ],
                });
            },
            switch: () => {
                GraphNodeFactory.addNode(this, {
                    componentType: 'switch',
                    interfaces: [
                        { mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                        { mac: MacAddress.generateRandomAddress(this.macDatabase).address },
                    ],
                });
            },
        };
    }

    /**
     * Adds a logical network node with default CIDR settings.
     * @internal
     */
    private addNetwork() {
        GraphNodeFactory.addNode(this, {
            componentType: 'net',
            net: {
                netid: '1.1.1.0',
                netmask: '255.255.255.0',
                bitmask: 24,
            },
        });
    }

    /**
     * Renders the authoring sidebar.
     * @internal
     *
     * @csspart options - Wrapper around authoring controls.
     */
    private asideTemplate(): TemplateResult {
        return html`
            <aside part="options" style="display: none">
                <form autocomplete="off">
                    <input class="importBtn" style="width: 11cqw;" type="file" id="import-file" />
                    <sl-tooltip content=${msg("Import a file created by this widget")} placement="bottom">
                        <button
                            class="importBtn"
                            type="button"
                            @click="${() => ImportExportController.importFile(this)}"
                        >
                            Import
                        </button>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Export the current graph")} placement="bottom">
                        <button
                            class="importBtn"
                            type="button"
                            @click="${() => ImportExportController.exportFile(this)}"
                        >
                            Export
                        </button>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Example graphs/exercises")} placement="bottom">
                        <button
                            class="importBtn"
                            type="button"
                            @click="${() => (this.renderRoot.querySelector('#example-graphs') as SlDialog).show()}"
                        >
                            Examples
                        </button>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Tutorials for features of this widget")} placement="bottom">
                        <button
                            class="importBtn"
                            type="button"
                            @click="${() => (this.renderRoot.querySelector('#instructions') as SlDialog).show()}"
                        >
                            Help
                        </button>
                    </sl-tooltip>
                </form>
                <h2>New Node</h2>
                <div class="componentMenu">
                    <sl-tooltip content=${msg("Host")} placement="top">
                        <sl-dropdown placement="bottom">
                            <button class="btn" id="host" slot="trigger"><sl-icon name="person"></sl-icon></button>
                            <sl-menu>
                                <sl-menu-item id="computer" @click="${this.clickOnComponentButton}"
                                    ><sl-icon name="pc-display-horizontal"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="mobile" @click="${this.clickOnComponentButton}"
                                    ><sl-icon name="phone"></sl-icon
                                ></sl-menu-item>
                            </sl-menu>
                        </sl-dropdown>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Network device")} placement="top">
                        <sl-dropdown placement="bottom">
                            <button class="btn" id="connector" slot="trigger"><sl-icon name="hdd"></sl-icon></button>
                            <sl-menu>
                                <sl-menu-item id="router" @click="${this.clickOnComponentButton}"
                                    >${msg("Router")} <sl-icon name="router"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="access-point" @click="${this.clickOnComponentButton}"
                                    >${msg("Access Point")} <sl-icon name="broadcast-pin"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="repeater" @click="${this.clickOnComponentButton}"
                                    >${msg("Repeater")} <sl-icon name="hdd"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="hub" @click="${this.clickOnComponentButton}"
                                    >${msg("Hub")} <sl-icon src="resources/icons/hub.svg"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="bridge" @click="${this.clickOnComponentButton}"
                                    >${msg("Bridge")} <sl-icon src="resources/icons/bridge.svg"></sl-icon
                                ></sl-menu-item>
                                <sl-menu-item id="switch" @click="${this.clickOnComponentButton}"
                                    >${msg("Switch")} <sl-icon src="resources/icons/switch.svg"></sl-icon
                                ></sl-menu-item>
                            </sl-menu>
                        </sl-dropdown>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Edge")} placement="top">
                        <button class="btn" id="edge" @click="${this.clickOnComponentButton}">
                            <sl-icon name="share"></sl-icon>
                        </button>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Network")} placement="top">
                        <button class="btn" id="net" @click="${this.clickOnComponentButton}">
                            <sl-icon name="diagram-3"></sl-icon>
                        </button>
                    </sl-tooltip>
                </div>
                <div class="nameBox">
                    <sl-tab-group id="physical-logical-group">
                        <sl-tab slot="nav" panel="physical">${msg("Physical Node")}</sl-tab>
                        <sl-tab slot="nav" panel="logical">${msg("Logical Node")}</sl-tab>

                        <sl-tab-panel name="physical" id="physical-node-panel" active>
                            <sl-input class="label-on-left" label="Name" id="inputName" placeholder="Name"></sl-input>
                            <sl-input
                                class="label-on-left"
                                label=${msg("Number of ports")}
                                id="ports"
                                placeholder=${msg("Number of input ports")}
                                type="number"
                                min="1"
                            ></sl-input>
                            <sl-button
                                size=${this.screen}
                                style="margin-top: 1cqw;"
                                @click="${() => DialogFactory.generateInputsDetailsForNode(this)}"
                                >${msg("Add details for ports")}</sl-button
                            >
                        </sl-tab-panel>
                        <sl-tab-panel name="logical" id="logical-node-panel">
                            <sl-input class="label-on-left" label=${msg("NetID")} id="net-num" placeholder="0.0.0.0"></sl-input>
                            <sl-input
                                class="label-on-left"
                                label=${msg("Netmask")}
                                id="net-mask"
                                placeholder="255.255.255.255"
                            ></sl-input>
                            <sl-input
                                class="label-on-left"
                                label=${msg("Bitmask")}
                                id="net-bitmask"
                                placeholder=""
                                type="number"
                                min="0"
                                max="32"
                            ></sl-input>
                        </sl-tab-panel>
                    </sl-tab-group>
                </div>
                <div class="colorPalette"></div>
                <div class="addOption">
                    <sl-tooltip content=${msg("Click to add your component")} placement="left" style="--max-width: 7cqw;">
                        <button class="addBtn" id="addCompBtn" @click="${() => GraphNodeFactory.addNode(this)}">
                            <sl-icon name="plus" disabled="${this.isEditable()}"></sl-icon>
                        </button>
                    </sl-tooltip>
                    <sl-tooltip content=${msg("Click to draw connecting links")} placement="left" style="--max-width: 7cqw;">
                        <button
                            class="addBtn"
                            id="drawBtn"
                            @click="${() => EdgeController.toggleDrawMode(this)}"
                            style="font-size: 1cqw;"
                        >
                            <sl-icon id="drawMode" name="plug"></sl-icon>
                        </button>
                    </sl-tooltip>
                    <sl-tooltip
                        content=${msg("Click to change color of existing components")}
                        placement="left"
                        style="--max-width: 9cqw;"
                    >
                        <button
                            class="addBtn"
                            id="resetColorBtn"
                            @click="${() => GraphNodeFactory.toggleResetColor(this)}"
                        >
                            <sl-icon id="changeColorMode" name="eyedropper"></sl-icon>
                        </button>
                    </sl-tooltip>
                </div>
                <sl-menu style="background-color: #F1F1F1; border: transparent; height: 100%;">
                    <sl-details summary=${msg("CIDR/Subnetting controller")} open>
                        <sl-menu-label
                            >${msg("Choose a mode")}:
                            <sl-select
                                size=${this.screen}
                                id="current-subnet-mode"
                                @sl-change="${(event: SlChangeEvent) => {
                                    Net.setMode((event.target as SlSelect).value as SubnettingMode, this);
                                }}"
                                value="MANUAL"
                            >
                                <sl-menu-item value="MANUAL">${msg("Manual Mode")}</sl-menu-item>
                                <sl-menu-item value="NET_BASED">${msg("Net-based Mode")}</sl-menu-item>
                                <sl-menu-item value="HOST_BASED">${msg("Host-based Mode")}</sl-menu-item>
                            </sl-select>
                        </sl-menu-label>
                        <sl-menu-item
                            @click="${(event: Event) => this.subnettingController.toggleDragAndDropSubnetting(event, this)}"
                            style="font-size: max(0.1cqw, 12px) !important;"
                            >${msg("Activate Draw-and-drop")}</sl-menu-item
                        >
                        <sl-menu-item
                            @click="${(event: Event) => this.subnettingController.toggleAssigningGateway(event, this)}"
                            style="font-size: max(0.1cqw, 12px) !important;"
                            >${msg("Drag to assign gateway")}</sl-menu-item
                        >
                        <sl-menu-item>
                            <sl-tooltip hoist content=${msg("Validate global address assignments")} placement="top">
                                <sl-button
                                    size=${this.screen}
                                    class="blue-button"
                                    @click="${() => this.subnettingController.validateAllNets(false, this)}"
                                    >${msg("Check")}</sl-button
                                >
                            </sl-tooltip>
                        </sl-menu-item>
                    </sl-details>

                    <sl-details id="packet-sending-extension" summary=${msg("Packet sending controller")}>
                        <sl-menu-item style="display: flex;">
                            <sl-button
                                size=${this.screen}
                                style="display: inline-block;"
                                class="blue-button set-source-btn"
                                id="setSourceBtn"
                                @click="${(event: Event) => this.packetSimulator.setSource(event, this)}"
                                >${msg("Choose sender")}</sl-button
                            >
                            <sl-select
                                size=${this.screen}
                                id="ip-source-select"
                                hoist
                                style="display: inline-block; margin-left: 7.5px;"
                                @sl-change="${(event: SlChangeEvent) => {
                                    this.packetSimulator.sourceIp = (event.target as SlInput).value;
                                }}"
                                value="127.0.0.1"
                            >
                                <sl-menu-item value="127.0.0.1">127.0.0.1</sl-menu-item>
                            </sl-select>
                        </sl-menu-item>
                        <sl-menu-item>
                            <sl-button
                                size=${this.screen}
                                style="display: inline-block;"
                                class="blue-button set-target-btn"
                                id="setTargetBtn"
                                @click="${(event: Event) => this.packetSimulator.setTarget(event, this)}"
                                >${msg("Choose receiver")}</sl-button
                            >
                            <sl-select
                                size=${this.screen}
                                id="ip-target-select"
                                hoist
                                style="display: inline-block;"
                                @sl-change="${(event: SlChangeEvent) => {
                                    this.packetSimulator.targetIp = (event.target as SlInput).value;
                                }}"
                                value="127.0.0.1"
                            >
                                <sl-menu-item value="127.0.0.1">127.0.0.1</sl-menu-item>
                            </sl-select>
                        </sl-menu-item>
                        <sl-menu-item
                            ><sl-input
                                class="label-on-left"
                                @sl-change="${(event: SlChangeEvent) => (this.packetSimulator.duration = +(event.target as SlInput).value * 1000)}"
                                label=${msg("Speed")}
                                type="number"
                                min="1"
                            ></sl-input
                        ></sl-menu-item>
                        <sl-menu-item
                            @click="${(event: Event) => {
                                const target = event.target as HTMLInputElement;
                                target.checked = !target.checked;
                                this.packetSimulator.focus = target.checked;
                            }}"
                            >${msg("Focus on animated nodes")}</sl-menu-item
                        >
                        <sl-menu-item>
                            <b><i>${msg("Session")}: </i></b>
                            <sl-tooltip hoist content=${msg("Create a new simulation session")} placement="top">
                                <sl-button
                                    class="blue-button"
                                    size=${this.screen}
                                    @click="${() => this.packetSimulator.initSession(this)}"
                                    >Init</sl-button
                                >
                            </sl-tooltip>
                            <sl-tooltip hoist content=${msg("Start sending a new packet")} placement="top">
                                <sl-button
                                    class="blue-button"
                                    size=${this.screen}
                                    @click="${() => this.packetSimulator.startSession(this)}"
                                    ><sl-icon name="play"
                                /></sl-button>
                            </sl-tooltip>
                            <sl-tooltip hoist content=${msg("Pause/resume all packets")} placement="top">
                                <sl-button
                                    class="blue-button"
                                    size=${this.screen}
                                    @click="${() => this.packetSimulator.pauseOrResumeSession(this)}"
                                    ><sl-icon
                                        id="pause-ani"
                                        src="/node_modules/@shoelace-style/shoelace/dist/assets/icons/pause.svg"
                                /></sl-button>
                            </sl-tooltip>
                            <sl-tooltip hoist content=${msg("Stop the simulation session")} placement="top">
                                <sl-button
                                    class="blue-button"
                                    size=${this.screen}
                                    @click="${() => this.packetSimulator.stopSession(this)}"
                                    ><sl-icon name="stop-circle"
                                /></sl-button>
                            </sl-tooltip>
                        </sl-menu-item>
                        <sl-menu-item>
                            <sl-details id="tables-for-packet-simulator" summary=${msg("Track tables")} open> </sl-details>
                        </sl-menu-item>
                    </sl-details>
                </sl-menu>
            </aside>
        `;
    }

    /**
     * Highlights the selected component group in the sidebar and switches to the appropriate tab panel.
     * @internal
     *
     * @param e Click event from a component button within the authoring sidebar.
     */
    private clickOnComponentButton(e: Event): void {
        this.currentComponentToAdd = (e.target as HTMLElement).getAttribute('id') ?? '';
        let nodeToHighLight: string = '';
        let panelToActive: string = '';
        switch (this.currentComponentToAdd) {
            case 'computer':
            case 'mobile':
                nodeToHighLight = 'host';
                panelToActive = 'physical';
                break;
            case 'router':
            case 'access-point':
            case 'hub':
            case 'repeater':
            case 'bridge':
            case 'switch':
                nodeToHighLight = 'connector';
                panelToActive = 'physical';
                break;
            case 'net':
                nodeToHighLight = 'net';
                panelToActive = 'logical';
                break;
            default:
                nodeToHighLight = this.currentComponentToAdd;
                break;
        }

        this.renderRoot.querySelectorAll('.btn').forEach((e) => {
            if (e.id == nodeToHighLight) {
                //highlight the chosen component
                (e as HTMLElement).style.border = 'solid 2px #404040';
            } else {
                //un-highlight other components
                (e as HTMLElement).style.border = 'solid 1px transparent';
            }
        });
        if (panelToActive != '') {
            (this.renderRoot.querySelector('#physical-logical-group') as SlTabGroup).show(panelToActive);
        }
    }

    /**
     * Lit lifecycle hook: reacts to property changes to keep UI/graph state in sync.
     * @internal
     */
    updated(changedProperties: Map<string, unknown>) {
        if (this.stateChangedExternally && this.networkAvailable) {
            this.stateChangedExternally = false;
            this.closeContextMenu();
            this.closeConfigDrawers();
            this.selectedObject = null;
            const mode = this.mode;
            this.switchMode('edit');
            if (mode === 'simulate') this.switchMode('simulate');
        }

        if (changedProperties.has('contentEditable')) {
            // new value is
            const newValue = this.isEditable();
            if (newValue) {
                if (this.networkAvailable) this._graph.elements().toggleClass('deletable', true);
                ['host', 'connector', 'edge', 'net', 'addCompBtn', 'drawBtn'].forEach((buttonId) => {
                    if (this.renderRoot.querySelector('#' + buttonId))
                        (this.renderRoot.querySelector('#' + buttonId) as HTMLButtonElement).disabled = false;
                });
            } else {
                if (this.networkAvailable) this._graph.elements().toggleClass('deletable', false);
                ['host', 'connector', 'edge', 'net', 'addCompBtn', 'drawBtn'].forEach((buttonId) => {
                    if (this.renderRoot.querySelector('#' + buttonId))
                        (this.renderRoot.querySelector('#' + buttonId) as HTMLButtonElement).disabled = true;
                });
            }
        }

        if (changedProperties.has('automate')) {
            // new value is
            const newValue = this.automate;
            const subnetMode = this.renderRoot.querySelector('#current-subnet-mode') as SlSelect | null;
            if (newValue) {
                if (subnetMode) subnetMode.disabled = false;
            } else {
                if (subnetMode) {
                    subnetMode.value = 'MANUAL';
                    subnetMode.disabled = true;
                }
                Net.setMode('MANUAL', this);
            }
        }
    }
}
