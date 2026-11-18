import type { MsgFn } from "@lit/localize";
import { localizer } from "@webwriter/lit/localize";
import { Permissions } from "@webwriter/lit/permissions";
import { Shortcuts } from "@webwriter/lit/shortcuts";
import { SceneController } from "@webwriter/lit/scene";
import { Viewport } from "@webwriter/lit/viewport";
import { sceneElements, type SceneBase as SceneElement, type SceneItem } from "@webwriter/widget/scene";
import { PixiScene } from "@webwriter/widget/scene/pixi";
import { transaction } from "@webwriter/widget/transaction";
import { sourceLocale, targetLocales } from "../../localization/generated/locale-codes.js";
import { html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { LitElementWw } from '@webwriter/lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { networkStyles, toastStyles } from '../components/network.styles';
import { toolboxStyles } from '../components/toolbox.styles';
import { contextMenuStyles } from '../components/context-menu.styles';
import { simulationMenuStyles } from '../components/simulation-menu.styles';
import { sceneStyles } from '../components/scene.styles';

import { contextMenuTemplate } from '../components/context-menu';
import { readData, writeData } from '../components/data-block';
import { PacketSimulator } from '../components/packet-simulator';
import { handleConnect, handleContext, handleMove, handleMoving, handleSelect } from '../components/scene-events';
import { sceneTemplate } from '../components/scene-template';
import { simulationMenuTemplate } from '../components/simulation-menu';
import { toastsTemplate, type Toast } from '../components/toasts';
import { toolboxTemplate } from '../components/toolbox';
import { Diagram } from '../model/diagram';
import { GraphEdge } from '../model/graph-edge';
import type { GraphNode } from '../model/graph-node';
import type { Box } from '../model/layout';
import { exportNetworkFile, importNetworkFile, importTables } from '../model/network-file';
import { diagramToSvg } from '../model/network-svg';
import { addNet, addPhysicalNode, newNodeData } from '../model/node-factory';
import type { NoticeVariant } from '../model/notice';
import { type Component, type Connection, loadDiagram, type Network, serializeDiagram } from '../model/serialization';
import { validateAllNets } from '../model/subnetting';

import '@shoelace-style/shoelace/dist/themes/light.css';

import SlButton from '@shoelace-style/shoelace/dist/components/button/button.component.js';
import SlDetails from '@shoelace-style/shoelace/dist/components/details/details.component.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.component.js';
import SlTooltip from '@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js';
import SlButtonGroup from '@shoelace-style/shoelace/dist/components/button-group/button-group.component.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.component.js';
import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import SlOption from '@shoelace-style/shoelace/dist/components/option/option.component.js';
import SlDrawer from '@shoelace-style/shoelace/dist/components/drawer/drawer.component.js';
import SlDivider from '@shoelace-style/shoelace/dist/components/divider/divider.component.js';
import SlMenu from '@shoelace-style/shoelace/dist/components/menu/menu.component.js';
import SlMenuItem from '@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js';
import SlColorPicker from '@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js';
import SlPopup, { type VirtualElement } from '@shoelace-style/shoelace/dist/components/popup/popup.component.js';
import SlTabGroup from '@shoelace-style/shoelace/dist/components/tab-group/tab-group.component.js';
import SlTab from '@shoelace-style/shoelace/dist/components/tab/tab.component.js';
import SlTabPanel from '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.component.js';
import SlIcon from '@shoelace-style/shoelace/dist/components/icon/icon.component.js';
import iconPencil from '@tabler/icons/outline/pencil.svg';
import iconPackages from '@tabler/icons/outline/packages.svg';
import iconMinimize from '@tabler/icons/outline/minimize.svg';
import iconMaximize from '@tabler/icons/outline/maximize.svg';

/**
 * @summary Visualization of network topologies. Can represent different kinds of networks.
 *
 * @tag ww-network
 * @tagname ww-network
 *
 * @attr {boolean} [automate=false] - Enables automation-related UI for subnetting.
 * @attr {'small'|'medium'} [screen='medium'] - Size forwarded to Shoelace controls.
 *
 * @prop {GraphNode | GraphEdge | null} [selectedObject] - The node, net or edge that was selected last.
 * @prop {Array<Component>} [components=[]] - Serialized node list.
 * @prop {Array<Connection>} [connections=[]] - Serialized edges between components.
 * @prop {Array<Network>} [networks=[]] - Serialized logical networks.
 *
 * @slot data - Direct application/json block stores network components, connections, and networks.
 *
 * @part canvas - The frame that holds the diagram and its controls.
 * @part net - A net, drawn as a box around its hosts.
 * @part node - A host or a connector.
 * @part edge - A connection between two nodes.
 *
 * Conversions: imports and exports a network file (`.json`, the file of the Import and Export actions); exports the diagram as
 * a picture (`image/svg+xml`: nets, connections, hosts and connectors with their names; simulation packets are left out).
 * Theme: text follows `--ww-text-color` and `--ww-font-family`; the selection and the link marks follow `--ww-theme-accent-1`.
 * Keyboard: Tab reaches the toolbox and the diagram; arrow keys move the selected node in edit mode, Enter on a node starts a
 * connection while Edge is on, the menu key opens the context menu, Delete removes the selection. Print: the controls are
 * hidden and the diagram prints as it is shown.
 */
@customElement('ww-network')
export class WwNetwork extends LitElementWw {
    static styles = [networkStyles, toastStyles, sceneStyles, toolboxStyles, contextMenuStyles, simulationMenuStyles];

    static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

    static scopedElements = {
        ...sceneElements,
        'ww-scene': PixiScene,
        'sl-button': SlButton,
        'sl-icon': SlIcon,
        'sl-button-group': SlButtonGroup,
        'sl-details': SlDetails,
        'sl-input': SlInput,
        'sl-tooltip': SlTooltip,
        'sl-alert': SlAlert,
        'sl-select': SlSelect,
        'sl-option': SlOption,
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

    static convertFrom = { '.json': 'importJson' };

    static convertTo = { '.json': 'exportJson', 'image/svg+xml': 'exportSvg' };

    static actions = {
        importNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Import network"), icon: "Upload", intent: "default", input: { type: "file", accept: ".json,application/json" } },
        exportNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Export network"), icon: "Download", intent: "default" },
        removeSelected: { label: (widget: { msg: MsgFn }) => widget.msg("Delete"), shortcut: ["Delete", "Backspace"], hidden: true },
    } as const;

    localize = localizer(this, {
        sourceLocale,
        targetLocales,
        load: (locale) => import(`../../localization/generated/${locale}.ts`),
        drawer: true,
    });

    public readonly msg: MsgFn = this.localize.msg;

    #permissions = new Permissions(this);

    /** @internal Runs the Delete key. */
    readonly shortcuts = new Shortcuts(this);

    /** The scene is the window of the viewport: it pans and zooms the diagram. */
    #viewport: Viewport = new Viewport(this, { bounds: () => this.#scene.extent(), can: () => !this.#scene.marquee });

    #scene: SceneController = new SceneController(this, {
        viewport: this.#viewport.core,
        can: (action) => (action === 'move' ? this.mode === 'edit' : action === 'connect' ? this.mode === 'edit' && this.drawModeOn : true),
    });

    #listeners?: AbortController;

    @property({ type: Boolean, reflect: true })
    accessor automate: boolean = false;

    @property({ type: String, reflect: true })
    accessor screen: 'small' | 'medium' = 'medium';

    /** The node, net or edge that was selected last. */
    @property({ type: Object })
    accessor selectedObject: GraphNode | GraphEdge | null = null;

    /** Serialized components (nodes). Used to populate the canvas and for export. */
    @property({ type: Array, attribute: false })
    accessor components: Array<Component> = [];

    /** Serialized connections (edges) between components. */
    @property({ type: Array, attribute: false })
    accessor connections: Array<Connection> = [];

    /** Serialized logical networks for subnetting and validation. */
    @property({ type: Array, attribute: false })
    accessor networks: Array<Network> = [];

    /** @internal Current widget mode. 'edit' enables graph editing, 'simulate' locks nodes and runs simulations. */
    @state()
    accessor mode: 'edit' | 'simulate' = 'edit';

    /** @internal Edge endpoint metadata of the selected edge, shown by the edge drawer. */
    @state()
    accessor selectedPorts: {
        source: { connectionType: 'ethernet' | 'wireless' | null; port: number | null };
        target: { connectionType: 'ethernet' | 'wireless' | null; port: number | null };
    } = {
        source: { connectionType: null, port: 0 },
        target: { connectionType: null, port: 0 },
    };

    /** @internal Which exclusive drag-and-drop mode ('subnetting' or 'gateway') is active. */
    @state()
    accessor mutexDragAndDrop: 'subnetting' | 'gateway' | null = null;

    /** @internal Whether dragging from a node draws an edge. */
    @state()
    accessor drawModeOn: boolean = false;

    /** @internal The end point (sender or receiver) the next click on a node chooses. */
    @state()
    accessor picking: 'source' | 'target' | null = null;

    /** @internal Pointer anchor; null while the context menu is closed. */
    @state()
    accessor contextMenuAnchor: VirtualElement | null = null;

    @state()
    accessor contextMenuColorOpen = false;

    /** @internal Whether the toolbox shows its buttons. */
    @state()
    accessor toolboxOpen = false;

    /** @internal The toolbox group whose buttons are shown, null when none. */
    @state()
    accessor toolboxGroup: string | null = null;

    @state()
    accessor toasts: Toast[] = [];

    @query('#contextMenu')
    accessor contextMenu!: SlPopup | null;

    @query('#myCanvas')
    accessor canvas!: HTMLElement;

    /** @internal The nodes and edges on show. */
    diagram: Diagram = new Diagram();

    /** @internal Runs the packet simulation. */
    packetSimulator: PacketSimulator = new PacketSimulator(this);

    /** @internal Preset color palette for node styling. */
    colors = [
        'Plum', '#BAADD1', '#9CB6D6', '#9DCBD1', 'LightSeaGreen', '#5FCCAB', '#ADE07A', '#E2E379',
        'Tomato', '#FFA6B4', '#FF938B', '#FFA07A', '#8A8A8A', '#A6A6A6', '#D4B6A0', '#C29C8D',
    ];

    /** @internal True once the diagram is built from the saved data. */
    networkAvailable = false;

    #dataObserver = new MutationObserver(() => this.restoreData());
    #skipDataWrite = false;
    #stateChangedExternally = false;
    #toastCount = 0;
    #view = '';

    constructor() {
        super();
        this.diagram = this.newDiagram();
    }

    /** True while the widget is in edit mode of the editor. */
    get editing(): boolean {
        return this.#permissions.editing;
    }

    protected willUpdate(changed: PropertyValues): void {
        if (!this.hasUpdated) {
            this.restoreData();
            this.build();
        }
        super.willUpdate(changed);
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);
        this.#dataObserver.observe(this, { childList: true, subtree: true });
        this.#stateChangedExternally = false;
        this.networkAvailable = true;
    }

    protected updated(changed: PropertyValues): void {
        super.updated(changed);
        const dataChanged = ['components', 'connections', 'networks'].some((key) => changed.has(key));
        if (this.hasUpdated && dataChanged && !this.#skipDataWrite) {
            writeData(this, { components: this.components, connections: this.connections, networks: this.networks });
        }
        if (dataChanged) this.#skipDataWrite = false;
        if (this.#stateChangedExternally) {
            this.#stateChangedExternally = false;
            this.closeContextMenu();
            this.closeConfigDrawers();
            this.selectedObject = null;
            const mode = this.mode;
            this.switchMode('edit');
            if (mode === 'simulate') this.switchMode('simulate');
        }

        if (changed.has('automate') && !this.automate) this.diagram.subnettingMode = 'MANUAL';

        // A pan or zoom closes the context menu, as it did on the canvas.
        const view = `${this.#viewport.x}|${this.#viewport.y}|${this.#viewport.scale}`;
        if (view !== this.#view) {
            this.#view = view;
            this.closeContextMenu();
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this.#listeners = new AbortController();
        this.ownerDocument.addEventListener('fullscreenchange', () => this.requestUpdate(), { signal: this.#listeners.signal });
        // firstUpdated observes only once; a re-inserted widget must observe again.
        if (this.hasUpdated) this.#dataObserver.observe(this, { childList: true, subtree: true });
    }

    disconnectedCallback() {
        this.#dataObserver.disconnect();
        super.disconnectedCallback();
        this.#listeners?.abort();
        this.packetSimulator.stopSession();
    }

    /** Reads a network file and builds its diagram; the widget changes only when the returned function runs. */
    async importJson(file: File): Promise<() => void> {
        let json: any;
        let diagram: Diagram;
        try {
            json = JSON.parse(await file.text());
            const lists = ['logical-nodes', 'physical-nodes', 'edges'];
            if (!lists.every((key) => Array.isArray(json?.[key]))) throw new Error('shape');
            diagram = this.newDiagram();
            importNetworkFile(diagram, json);
        } catch {
            throw new Error(this.msg('This file is not a network file.'));
        }
        return () => {
            this.packetSimulator.stopSession();
            this.diagram = diagram;
            if (json.hasOwnProperty('inited')) {
                this.packetSimulator.initSession();
                importTables(this.diagram, json);
            }
            this.apply();
        };
    }

    importNetwork(files: File[]) {
        if (!files[0]) return;
        this.importJson(files[0]).then(
            (apply) => apply(),
            (error: Error) => this.notify('warning', '', error.message)
        );
    }

    /** The topology as a network file: hosts, connectors, nets and connections, with the tables of a running simulation. */
    exportJson(): File {
        const data = exportNetworkFile(this.diagram, this.packetSimulator.inited);
        return new File([JSON.stringify(data)], 'network.json', { type: 'application/json' });
    }

    /** The diagram as a picture. Simulation packets and the view's pan and zoom are not part of it. */
    exportSvg(): File {
        return new File([diagramToSvg(this.diagram)], 'network.svg', { type: 'image/svg+xml' });
    }

    exportNetwork() {
        const file = this.exportJson();
        const link = this.ownerDocument.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = 'network-graph-' + Date.now() + '.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    // The scene's events, handled in components/scene-events.ts
    onSelect = handleSelect;
    onMoving = handleMoving;
    onMove = handleMove;
    onConnect = handleConnect;
    onContext = handleContext;

    /** @internal The frames of the nets as they were drawn when a move began, null outside a move. */
    frames: Map<string, Box> | null = null;

    /** The frames of the nets with content as the scene draws them. */
    drawnFrames(): Map<string, Box> {
        const frames = new Map<string, Box>();
        const scene = this.renderRoot.querySelector<SceneElement>('ww-scene');
        for (const group of this.renderRoot.querySelectorAll<SceneItem>('ww-group[data-ww-key]')) {
            const drawing = scene?.drawingOf(group);
            if (drawing?.type === 'group' && drawing.frame) frames.set(group.dataset.wwKey!, drawing.frame);
        }
        return frames;
    }

    private newDiagram(): Diagram {
        const diagram = new Diagram(this.msg, (variant, header, message) => this.notify(variant, header, message));
        diagram.frameOf = (id) => (this.frames ?? this.drawnFrames()).get(id);
        diagram.subnettingMode = this.diagram?.subnettingMode ?? 'MANUAL';
        return diagram;
    }

    /** Tells the user. Errors and successes only reach the console: a widget has no place for them in the page. */
    private notify(variant: NoticeVariant, header: string, message: string): void {
        if (variant === 'danger' || variant === 'success') {
            console.error([header, message].filter(Boolean).join(' - '));
            return;
        }
        this.toasts = [...this.toasts, { id: ++this.#toastCount, variant, header, message }];
    }

    dismissToast(id: number): void {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
    }

    /** Builds the diagram from the saved data. */
    private build(): void {
        this.diagram = this.newDiagram();
        loadDiagram(this.diagram, { components: this.components, connections: this.connections, networks: this.networks });
    }

    /** Runs a change of the diagram as one undo step and saves the result in the document. */
    apply(change?: () => void): void {
        void transaction(this, async () => {
            change?.();
            const { components, connections, networks } = serializeDiagram(this.diagram);
            this.components = components;
            this.connections = connections;
            this.networks = networks;
            this.requestUpdate();
            await this.updateComplete;
        });
    }

    private restoreData() {
        const data = readData(this);
        const changed = (['components', 'connections', 'networks'] as const).filter((key) => {
            const value = data[key];
            return Array.isArray(value) && JSON.stringify(value) !== JSON.stringify(this[key]);
        });
        for (const key of changed) (this as any)[key] = data[key];
        if (changed.length) {
            this.#skipDataWrite = true;
            this.#stateChangedExternally = true;
        }
    }

    /** @internal Closes the context menu, optionally returning keyboard focus to the canvas. */
    public closeContextMenu(restoreFocus = false): void {
        this.contextMenuColorOpen = false;
        this.contextMenuAnchor = null;
        if (restoreFocus) this.renderRoot.querySelector<HTMLElement>('ww-scene ww-node')?.focus({ preventScroll: true });
    }

    /** Closes every widget-contained configuration drawer, so that a drawer never shows stale content. */
    public closeConfigDrawers(): void {
        this.renderRoot.querySelectorAll('sl-drawer[open]').forEach((drawer) => (drawer as SlDrawer).hide());
    }

    /** Switches between 'edit' and 'simulate'. Leaving the simulation rebuilds the diagram from the saved data. */
    private switchMode(mode: 'edit' | 'simulate'): void {
        this.mode = mode;
        this.picking = null;

        if (mode === 'simulate') {
            this.drawModeOn = false;
            this.packetSimulator.initSession();
            return;
        }

        // Stop running packet animations before their nodes are removed.
        if (this.packetSimulator.inited) this.packetSimulator.stopSession();
        this.build();
        this.requestUpdate();
    }

    /** Adds a host, a connector or a net from the toolbox. */
    addNode(kind: string): void {
        this.apply(() => {
            const data = newNodeData(this.diagram, kind);
            if ('net' in data) addNet(this.diagram, data);
            else addPhysicalNode(this.diagram, data);
        });
        void this.updateComplete.then(() => this.centerView());
    }

    /** Deletes the selected host, net or connection when the Delete key is pressed on the scene. */
    removeSelected(): boolean {
        const onScene = !!this.shadowRoot?.activeElement?.closest('ww-scene');
        if (this.mode !== 'edit' || !this.selectedObject || !onScene || this.contextMenuAnchor) return false;
        this.deleteSelected();
        return true;
    }

    /** Pans the view so that the diagram is in the middle of it. */
    private centerView(): void {
        const box = this.#scene.extent();
        if (box) void this.#viewport.centerOn({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }

    deleteSelected(): void {
        const selected = this.selectedObject;
        if (!selected) return;
        this.apply(() => {
            if (selected instanceof GraphEdge) this.diagram.removeEdge(selected.id);
            else this.diagram.removeNode(selected.id);
        });
        this.selectedObject = null;
    }

    toggleDrawMode(): void {
        this.drawModeOn = !this.drawModeOn;
    }

    toggleDragAndDropSubnetting(): void {
        if (this.mutexDragAndDrop === 'gateway') return;
        this.mutexDragAndDrop = this.mutexDragAndDrop === 'subnetting' ? null : 'subnetting';
    }

    toggleAssigningGateway(): void {
        if (this.mutexDragAndDrop === 'subnetting') return;
        this.mutexDragAndDrop = this.mutexDragAndDrop === 'gateway' ? null : 'gateway';
    }

    validateAllNets(): boolean {
        return validateAllNets(this.diagram, false);
    }

    /** Lets the next click on a node choose the sender or receiver of the simulation. */
    pickEndPoint(role: 'source' | 'target'): void {
        this.picking = this.picking === role ? null : role;
    }

    /** Toggles fullscreen mode using the Fullscreen API. */
    private async handleFullscreenToggle() {
        if (this.isFullscreen) {
            await this.ownerDocument.exitFullscreen();
        } else {
            try {
                await this.requestFullscreen();
            } catch (error) {
                console.error("Failed to enter fullscreen mode.");
            }
        }
        this.requestUpdate();
    }

    private get isFullscreen(): boolean {
        return this.ownerDocument.fullscreenElement === this;
    }

    public render(): TemplateResult {
        return html`
            <div class="canvas" id="myCanvas" part="canvas">
                <div class="modeSwitch">
                    <sl-select
                        value=${this.mode}
                        label=${this.msg("Mode")}
                        @sl-change=${(event: Event) => {
                            this.closeContextMenu();
                            this.switchMode((event.target as HTMLSelectElement).value as 'edit' | 'simulate');
                        }}
                        size="small"
                    >
                        <span slot="prefix"><sl-icon src=${this.mode === 'edit' ? iconPencil : iconPackages}></sl-icon></span>
                        <sl-option value="edit">${this.msg("Edit")}</sl-option>
                        <sl-option value="simulate">${this.msg("Simulate")}</sl-option>
                    </sl-select>
                </div>

                ${sceneTemplate.call(this)} ${toolboxTemplate.call(this)} ${contextMenuTemplate.call(this)}
                ${simulationMenuTemplate.call(this)} ${toastsTemplate.call(this)}
                <div class="viewportControls" data-ww-viewport-controls></div>

                <sl-tooltip content=${this.isFullscreen ? this.msg("Exit Fullscreen") : this.msg("Fullscreen")}>
                    <sl-button size="large" circle class="fullscreenButton" aria-label=${this.isFullscreen ? this.msg("Exit Fullscreen") : this.msg("Fullscreen")} @click=${() => this.handleFullscreenToggle()}>
                        <sl-icon src=${this.isFullscreen ? iconMinimize : iconMaximize}></sl-icon>
                    </sl-button>
                </sl-tooltip>
            </div>
        `;
    }
}
