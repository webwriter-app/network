# Network (`@webwriter/network@3.0.0`)
[License: MIT](LICENSE) | Version: 3.0.0

Visualization of network topologies. Can represent different kinds of networks.

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
| `WwNetwork.actions` | `{<br>        importNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Import network"), icon: "Upload", intent: "default", input: { type: "file", accept: ".json,application/json" } },<br>        exportNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Export network"), icon: "Download", intent: "default" },<br>    }` | - | `{ importNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Import network"), icon: "Upload", intent: "default", input: { type: "file", accept: ".json,application/json" } }, exportNetwork: { label: (widget: { msg: MsgFn }) => widget.msg("Export network"), icon: "Download", intent: "default" }, }` | ✗ |
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
| `onMove` | - | - | `handleMove` | ✗ |
| `onConnect` | - | - | `handleConnect` | ✗ |
| `onContextMenu` | - | - | `handleContextMenu` | ✗ |
| `diagram` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `importNetwork` | - | `files: File[]`
| `exportNetwork` | - | -
| `dismissToast` | - | `id: number`
| `apply` | Runs a change of the diagram as one undo step and saves the result in the document. | `change: () => void`
| `closeConfigDrawers` | Closes every widget-contained configuration drawer, so that a drawer never shows stale content. | -
| `addNode` | Adds a host, a connector or a net from the toolbox. | `kind: string`
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

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public events, custom CSS properties, or CSS parts.*


---
*Generated with @webwriter/build@1.14.0*