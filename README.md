# Network (`@webwriter/network@2.0.8`)
[License: MIT](LICENSE) | Version: 2.0.8

Visualization of network topologies. Can represent different kinds of networks.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Simple Network | `@webwriter/network/snippets/simple-network.html` |
| Complex Network | `@webwriter/network/snippets/complex-network.html` |
| Triple Network | `@webwriter/network/snippets/triple-network.html` |



## `NetworkComponent` (`<ww-network>`)


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
| `automate` (`automate`) | `boolean` | Enables automation-related UI. | `false` | ✓ |
| `screen` (`screen`) | `'small' \| 'medium'` | Controls the default size of Shoelace controls within this widget. | `'medium'` | ✓ |
| `selectedObject` (`selectedObject`) | `any` | The currently selected Cytoscape element (node or edge). | - | ✗ |
| `components` (`components`) | `Array<Component>` | Serialized node list. | `[]` | ✓ |
| `connections` (`connections`) | `Array<Connection>` | Serialized edges between components. | `[]` | ✓ |
| `networks` (`networks`) | `Array<Network>` | Serialized logical networks. | `[]` | ✓ |
| `net_mode` | `SubnettingMode` | - | `'MANUAL'` | ✗ |
| `NetworkComponent.shadowRootOptions` | `object` | Shadow root options. | `{ ...LitElement.shadowRootOptions, delegatesFocus: true }` | ✗ |
| `NetworkComponent.scopedElements` | - | Scoped element registry for Shoelace components used in the template. | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| options | Sidebar container for import/export and controllers. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, events, or custom CSS properties.*


---
*Generated with @webwriter/build@1.9.1*