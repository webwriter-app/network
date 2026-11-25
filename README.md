# Network (`@webwriter/network@3.0.0`)
[License: MIT](LICENSE) | Version: 3.0.0

Visualize network topologies and compare different kinds of networks.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Simple Network | `@webwriter/network/snippets/simple-network.html` |
| Complex Network | `@webwriter/network/snippets/complex-network.html` |
| Triple Network | `@webwriter/network/snippets/triple-network.html` |



## `WwNetwork` (`<ww-network>`)


### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/network/widgets/ww-network.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/network/widgets/ww-network.js"></script>
<ww-network></ww-network>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/network
```

```html
<link href="@webwriter/network/widgets/ww-network.css" rel="stylesheet">
<script type="module" src="@webwriter/network/widgets/ww-network.js"></script>
<ww-network></ww-network>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WwNetwork.shadowRootOptions` | `object` | - | `{ ...LitElement.shadowRootOptions, delegatesFocus: true }` | ✗ |
| `WwNetwork.scopedElements` | `object` | - | `{ ...sceneElements, 'ww-scene': PixiScene, 'sl-button': SlButton, 'sl-icon': SlIcon, 'sl-button-group': SlButtonGroup, 'sl-details': SlDetails, 'sl-input': SlInput, 'sl-tooltip': SlTooltip, 'sl-alert': SlAlert, 'sl-select': SlSelect, 'sl-option': SlOption, 'sl-drawer': SlDrawer, 'sl-divider': SlDivider, 'sl-menu': SlMenu, 'sl-menu-item': SlMenuItem, 'sl-color-picker': SlColorPicker, 'sl-popup': SlPopup, 'sl-tab-group': SlTabGroup, 'sl-tab': SlTab, 'sl-tab-panel': SlTabPanel, }` | ✗ |
| `WwNetwork.convertFrom` | `object` | - | `{ '.json': 'importJson' }` | ✗ |
| `WwNetwork.convertTo` | `object` | - | `{ '.json': 'exportJson', 'image/svg+xml': 'exportSvg' }` | ✗ |
| `WwNetwork.actions` | `{<br>        importNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Import network"), icon: "Upload", intent: "default", input: { type: "file", accept: ".json,application/json" } },<br>        exportNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Export network"), icon: "Download", intent: "default" },<br>        removeSelected: { label: (widget: { msg: MsgFn }) => widget.msg("Delete"), shortcut: ["Delete", "Backspace"], hidden: true },<br>    }` | - | `{ importNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Import network"), icon: "Upload", intent: "default", input: { type: "file", accept: ".json,application/json" } }, exportNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Export network"), icon: "Download", intent: "default" }, removeSelected: { label: (widget: { msg: MsgFn }) => widget.msg("Delete"), shortcut: ["Delete", "Backspace"], hidden: true }, }` | ✗ |
| `localize` | - | - | - | ✗ |
| `msg` | `MsgFn` | - | - | ✗ |
| `automate` (`automate`) | `boolean` | - | `false` | ✓ |
| `screen` (`screen`) | `'small' \| 'medium'` | - | `'medium'` | ✓ |
| `selectedObject` (`selectedObject`) | `GraphNode \| GraphEdge \| null` | The node, net or edge that was selected last. | `null` | ✗ |
| `components` | `Array<Component>` | Serialized node list. | `[]` | ✗ |
| `connections` | `Array<Connection>` | Serialized edges between components. | `[]` | ✗ |
| `networks` | `Array<Network>` | Serialized logical networks. | `[]` | ✗ |
| `contextMenuColorOpen` | `boolean` | - | `false` | ✗ |
| `toasts` | `Toast[]` | - | `[]` | ✗ |
| `contextMenu` | `SlPopup \| null` | - | - | ✗ |
| `canvas` | `HTMLElement` | - | - | ✗ |
| `editing` | `boolean` | True while the widget is in edit mode of the editor. | - | ✗ |
| `onSelect` | - | - | `handleSelect` | ✗ |
| `onMoving` | - | - | `handleMoving` | ✗ |
| `onMove` | - | - | `handleMove` | ✗ |
| `onConnect` | - | - | `handleConnect` | ✗ |
| `onContext` | - | - | `handleContext` | ✗ |
| `diagram` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `importJson` | Reads a network file and builds its diagram; the widget changes only when the returned function runs. | `file: File`
| `importNetwork` | - | `files: File[]`
| `exportJson` | The topology as a network file: hosts, connectors, nets and connections, with the tables of a running simulation. | -
| `exportSvg` | The diagram as a picture. Simulation packets and the view's pan and zoom are not part of it. | -
| `exportNetwork` | - | -
| `drawnFrames` | The frames of the nets with content as the scene draws them. | -
| `dismissToast` | - | `id: number`
| `apply` | Runs a change of the diagram as one undo step and saves the result in the document. | `change: () => void`
| `closeConfigDrawers` | Closes every widget-contained configuration drawer, so that a drawer never shows stale content. | -
| `addNode` | Adds a host, a connector or a net from the toolbox. | `kind: string`
| `removeSelected` | Deletes the selected host, net or connection when the Delete key is pressed on the scene. | -
| `deleteSelected` | - | -
| `toggleDrawMode` | - | -
| `toggleDragAndDropSubnetting` | - | -
| `toggleAssigningGateway` | - | -
| `validateAllNets` | - | -
| `pickEndPoint` | Lets the next click on a node choose the sender or receiver of the simulation. | `role: 'source' | 'target'`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Slots
| Name | Description | Content Type |
| :--: | :---------: | :----------: |
| `data` | Direct application/json block stores network components, connections, and networks. | - |

*[Slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) define how the content of the widget is rendered.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| canvas | The frame that holds the diagram and its controls. |
| net | A net, drawn as a box around its hosts. |
| node | A host or a connector. |
| edge | A connection between two nodes. Conversions: imports and exports a network file (`.json`, the file of the Import and Export actions); exports the diagram as a picture (`image/svg+xml`: nets, connections, hosts and connectors with their names; simulation packets are left out). Theme: text follows `--ww-text-color` and `--ww-font-family`; the selection and the link marks follow `--ww-theme-accent-1`. Keyboard: Tab reaches the toolbox and the diagram; arrow keys move the selected node in edit mode, Enter on a node starts a connection while Edge is on, the menu key opens the context menu, Delete removes the selection. Print: the controls are hidden and the diagram prints as it is shown. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |
| `importFormats` | `.json` |
| `exportFormats` | `.json,image/svg+xml` |

*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public events, or custom CSS properties.*


---
*Generated with @webwriter/build@1.15.0*
