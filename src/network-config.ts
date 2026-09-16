import { NetworkComponent } from './index';
import cytoscape from 'cytoscape/dist/cytoscape.esm.min';
import edgehandles from 'cytoscape-edgehandles/cytoscape-edgehandles';
import 'cytoscape-context-menus/cytoscape-context-menus';
import compoundDragAndDrop from 'cytoscape-compound-drag-and-drop/cytoscape-compound-drag-and-drop';
import nodeHtmlLabel from 'cytoscape-node-html-label/dist/cytoscape-node-html-label.min';
import { EventObject, NodeSingular, EdgeSingular } from 'cytoscape';

// import CSS as well
import 'cytoscape-context-menus/cytoscape-context-menus.css';
import { EdgeController } from './event-handlers/edge-controller';

import { AlertHelper } from './utils/AlertHelper';
import { Address } from './adressing/Address';
import { Net } from './components/logicalNodes/Net';
import { PhysicalNode } from './components/physicalNodes/PhysicalNode';
import { GraphNodeFactory } from './event-handlers/component-manipulation';

// register extension
// cytoscape.use(contextMenus);
cytoscape.use(edgehandles);
cytoscape.use(compoundDragAndDrop);
cytoscape.use(nodeHtmlLabel);

export function initNetwork(network: NetworkComponent): void {
    if (network.networkAvailable) network._graph.removeData();
    if (network.packetSimulator.inited) {
        network.packetSimulator.stopSession(network);
    }
    network.networkAvailable = true;
    let style = [
        {
            selector: '[name]',
            style: {
                label: 'data(name)',
            },
        },
        {
            selector: ':selected',
            style: {
                'background-color': 'grey',
                'line-color': 'black',
                'target-arrow-color': 'black',
                'source-arrow-color': 'black',
                'text-outline-color': 'black',
            },
        },
        {
            selector: 'edge',
            style: {
                width: 1,
                'curve-style': 'straight',
            },
        },
        {
            selector: '.color-edge',
            style: {
                'line-color': 'data(color)',
                color: 'black',
            },
        },
        {
            selector: '.unconfigured-edge',
            style: {
                'line-style': 'dotted',
                'line-opacity': 0.8,
                'font-size': 8,
                label: 'Please assign ports/interfaces',
                'edge-text-rotation': 'autorotate',
            },
        },
        {
            selector: '.labelled-edge',
            style: {
                'text-wrap': 'wrap',
                'font-size': 8,
                'edge-text-rotation': 'autorotate',
                'source-text-offset': 70,
                'source-text-rotation': 'autorotate',
                'target-text-offset': 70,
                'target-text-rotation': 'autorotate',
                'source-label': function (edge: EdgeSingular) {
                    let source: PhysicalNode = edge.data('from');
                    let port: number = edge.data('inPort');
                    let portData: Map<string, any> | undefined = source?.portData?.get(port);
                    if (portData == undefined) return '';
                    let label = '';
                    //TOEXTEND:hide IPv6 since the widget doesn't support IPv6 atm
                    portData.forEach(
                        (value, key) =>
                            (label +=
                                key == 'Connection Type' || key == 'IPv6'
                                    ? ''
                                    : value instanceof Address
                                    ? key + ': ' + value.address + '\n'
                                    : value + '\n')
                    );
                    return label + "\n\n\u2060"; // Add invisible lines to make label lower
                },
                'target-label': function (edge: EdgeSingular) {
                    let target: PhysicalNode = edge.data('to');
                    let port: number = edge.data('outPort');
                    let portData: Map<string, any> | undefined = target?.portData?.get(port);
                    if (portData == undefined) return '';
                    let label = '';
                    portData.forEach(
                        (value, key) =>
                            (label +=
                                key == 'Connection Type' || key == 'IPv6'
                                    ? ''
                                    : value instanceof Address
                                    ? key + ': ' + value.address + '\n'
                                    : value + '\n')
                    );
                    return "\u2060\n\n\n" + label; // Add invisible lines to make label higher
                },
                label: '',
            },
        },
        {
            selector: '.wireless-edge',
            style: {
                'line-style': 'dashed',
                'line-dash-pattern': [6, 3],
            },
        },
        {
            selector: '.wired-edge',
            style: {
                'line-style': 'solid',
            },
        },
        {
            selector: '.logical-edge',
            style: {
                'line-style': 'dotted',
            },
        },
        {
            selector: '.physical-node',
            style: {
                'text-valign': 'bottom',
                'text-halign': 'center',
                shape: 'round-rectangle',
                height: 20,
                width: 20,
                'font-size': 15,
                'text-wrap': 'wrap',
                'background-color': 'data(color)',
                'background-image': 'data(backgroundPath)',
                'font-family': 'monospace',
            },
        },
        {
            selector: '.unconfigured-net',
            style: {
                label: 'unconfigured',
            },
        },
        {
            selector: '.net-node',
            style: {
                'text-valign': 'top',
                'text-halign': 'center',
                shape: 'round-rectangle',
                height: 50,
                width: 50,
                'font-size': 8,
                'text-wrap': 'wrap',
                'font-family': 'monospace',
                'background-opacity': 0.4,
                'background-color': 'data(color)',
            },
        },
        {
            selector: '.gateway-node',
            style: {
                'background-fill': 'linear-gradient',
                'background-gradient-stop-colors': function (gateway: NodeSingular) {
                    let colors: any[] = [];
                    let nets = gateway.data('nets');
                    if (nets.length == 0) colors = ['grey'];

                    gateway.data('nets').forEach((net: any) => {
                        colors.push(net.color);
                    });
                    return colors.join(' ');
                },
            },
        },
        {
            selector: '.data-node',
            style: {
                'text-valign': 'center',
                'text-halign': 'center',
                shape: 'round-rectangle',
                height: 15,
                width: 60,
                'font-size': 10,
                'text-wrap': 'wrap',
                'font-family': 'monospace',
            },
        },
        {
            selector: '.data-node-layer2-layer3',
            style: {
                'background-image': 'resources/datagram/2header-3header.png',
                label: 'L2 L3 DATA',
            },
        },
        {
            selector: '.arp-req-node',
            style: {
                'background-image': 'resources/datagram/2header.png',
                label: 'L2 ARP req',
            },
        },
        {
            selector: '.arp-res-node',
            style: {
                'background-image': 'resources/datagram/2header.png',
                label: 'L2 ARP res',
            },
        },
        {
            selector: '.data-node-layer3',
            style: {
                'background-image': 'resources/datagram/3header.png',
                label: 'L3    DATA',
            },
        },
        {
            selector: '.processing-data-node-2part',
            style: {
                'background-image': 'resources/datagram/2part-green.png',
            },
        },
        {
            selector: '.discard-data-node-2part',
            style: {
                'background-image': 'resources/datagram/2part-red.png',
            },
        },
        {
            selector: '.processing-data-node-3part',
            style: {
                'background-image': 'resources/datagram/3part-green.png',
            },
        },
        {
            selector: '.discard-data-node-3part',
            style: {
                'background-image': 'resources/datagram/3part-red.png',
            },
        },
    ];
    cytoscape.warnings(false);
    network._graph = cytoscape({
        container: network._cy,

        boxSelectionEnabled: false,
        autounselectify: true,

        style: style as any,

        layout: {
            name: 'grid',
            padding: 2,
        },
        // initial viewport state:
        // zoom: 1,
        // pan: { x: 0, y: 0 },
        minZoom: 0.5,
        maxZoom: 5,
        wheelSensitivity: 5,
    });

    //options for context menu
    // let menuOptions = {
    //     evtType: 'cxttap',
    //     menuItems: [
    //         {
    //             id: 'details-for-host',
    //             content: 'Edit details',
    //             tooltipText: 'Edit details',
    //             selector: '.physical-node',
    //             onClickFunction: function (event) {
    //                 let node = event.target;
    //                 let id = node.data().id;
    //                 if (node.isChild()) {
    //                     DialogFactory.handleChangesInDialogForPhysicalNode(
    //                         id,
    //                         node,
    //                         network,
    //                         node.hasClass('gateway-node'),
    //                         node.parent().data()
    //                     );
    //                 } else {
    //                     DialogFactory.handleChangesInDialogForPhysicalNode(
    //                         id,
    //                         node,
    //                         network,
    //                         node.hasClass('gateway-node')
    //                     );
    //                 }
    //             },
    //             hasTrailingDivider: true,
    //         },
    //         {
    //             id: 'details-for-net',
    //             content: 'Edit details',
    //             tooltipText: 'Edit details',
    //             selector: '.net-node',
    //             onClickFunction: function (event) {
    //                 let node = event.target;
    //                 let id = node.data().id;

    //                 DialogFactory.handleChangesInDialogForNet(id, node, network);
    //             },
    //             hasTrailingDivider: true,
    //         },
    //         {
    //             id: 'configure-port',
    //             content: 'Configure ports for this connection',
    //             selector: '.unconfigured-edge',
    //             onClickFunction: function (event) {
    //                 let edge = event.target;
    //                 let graphEdge: GraphEdge = edge.data();
    //                 DialogFactory.generateInputsDetailsForEdge(network, edge, graphEdge.from, graphEdge.to);
    //             },
    //             hasTrailingDivider: true,
    //         },
    //         {
    //             id: 'configure-default-gateway',
    //             content: 'Configure default gateway for this node',
    //             selector: '.default-gateway-not-found, .gateway-changeable',
    //             onClickFunction: function (event) {
    //                 let node = event.target;
    //                 DialogFactory.handleChangeDefaultGateway(node.parent().data(), node.id(), node, network);
    //             },
    //             hasTrailingDivider: true,
    //         },
    //         {
    //             id: 'remove', // ID of menu item
    //             content: 'Remove', // Display content of menu item
    //             tooltipText: 'Remove this component', // Tooltip text for menu item
    //             // Filters the elements to have this menu item on cxttap
    //             // If the selector is not truthy no elements will have this menu item on cxttap
    //             selector: '.deletable',
    //             onClickFunction: (event) => {
    //                 // The function to be executed on click
    //                 let component = event.target;
    //                 if (component.isEdge()) {
    //                     EdgeController.removeConnection(component.data(), network._graph);
    //                 } else {
    //                     //GraphNodeFactory.removeNode(component, network);
    //                 }
    //                 component.remove();
    //             },
    //             disabled: false, // Whether the item will be created as disabled
    //             show: true, // Whether the item will be shown or not
    //             hasTrailingDivider: true, // Whether the item will have a trailing divider
    //             coreAsWell: false, // Whether core instance have this item on cxttap
    //         },
    //         {
    //             id: 'details-data',
    //             content: 'Details',
    //             tooltipText: 'Details',
    //             selector: '.data-node',
    //             onClickFunction: function (event) {
    //                 let node = event.target.data();
    //                 DialogFactory.showDataHeaders(node as Data, network);
    //             },
    //             hasTrailingDivider: true,
    //         },
    //     ],
    //     menuItemClasses: ['custom-menu-item', 'custom-menu-item:hover'],
    //     contextMenuClasses: ['custom-context-menu'],
    // };

    // options for edgehandles
    let edgehandlesOptions = {
        canConnect: function (sourceNode: any, targetNode: any) {
            // whether an edge can be created between source and target
            return EdgeController.canConnect(sourceNode, targetNode);
        },
        edgeParams: function (sourceNode: any, targetNode: any) {
            return EdgeController.newUnconfiguredEdge(network, sourceNode.data(), targetNode.data());
        },
        preview: true, // whether to show added edges preview before releasing selection
        stackOrder: 4, // Controls stack order of edgehandles canvas element by setting it's z-index
        handleSize: 10, // the size of the edge handle put on nodes
        handleLineType: 'ghost', // can be 'ghost' for real edge, 'straight' for a straight line, or 'draw' for a draw-as-you-go line
        handleLineWidth: 1, // width of handle line in pixels
        handleIcon: false, // Pass an Image-object to use as icon on handle. Icons are resized according to zoom and centered in handle.
        handleNodes: 'node',

        hoverDelay: 150, // time spent hovering over a target node before it is considered selected
        snap: false, // when enabled, the edge can be drawn by just moving close to a target node (can be confusing on compound graphs)
        snapThreshold: 50, // the target node must be less than or equal to this many pixels away from the cursor/finger
        snapFrequency: 15, // the number of times per second (Hz) that snap checks done (lower is less expensive)
        noEdgeEventsInDraw: true, // set events:no to edges during draws, prevents mouseouts on compounds
        disableBrowserGestures: true, // during an edge drawing gesture, disable browser gestures such as two-finger trackpad swipe and pinch-to-zoom
    };

    //options for drap-and-drop compound nodes - no handle on drag out of compound
    const subnettingOptions = {
        grabbedNode: (node: any) => {
            return node.connectedEdges().length == 0;
        }, // nodes valid to grab and drop into net: ones that don't have any link
        dropTarget: (dropTarget: any, grabbedNode: any) => {
            grabbedNode.on('cdnddrop', (_event: EventObject, target: NodeSingular, sibling: NodeSingular) => {
                let parent = target != null ? target : sibling;
                if (parent.data() instanceof Net) {
                    if (network.subnettingMode == 'NET_BASED') {
                        //the subnet must be configured to drag hosts into (net_mode)
                        let bitmask: number = parent.data().bitmask;
                        if (bitmask != null && bitmask != undefined && !Number.isNaN(bitmask)) {
                            if (!parent.hasClass('unconfigured-net')) {
                                network.subnettingController.onDragInACompound(
                                    grabbedNode,
                                    parent,
                                    network.ipv4Database
                                );
                            }
                        } else {
                            AlertHelper.toastAlert(
                                'danger',
                                'exclamation-triangle',
                                'Net-based mode activated:',
                                'Unable to drag hosts into unconfigured net.'
                            );
                        }
                    } else {
                        network.subnettingController.onDragInACompound(grabbedNode, parent, network.ipv4Database);
                    }
                }
            });

            if (dropTarget.hasClass('unconfigured-net') && network.subnettingMode == 'NET_BASED') return false;
            return dropTarget.data() instanceof Net;
        }, // filter function to specify which parent nodes are valid drop targets
        dropSibling: (dropSibling: any, _grabbedNode: any) => {
            return dropSibling.data() instanceof Net;
        }, // filter function to specify which orphan nodes are valid drop siblings
        newParentNode: (_grabbedNode: any, dropSibling: any) => {
            if (dropSibling.data() instanceof Net) return dropSibling;
        }, // specifies element json for parent nodes added by dropping an orphan node on another orphan (a drop sibling). You can chose to return the dropSibling in which case it becomes the parent node and will be preserved after all its children are removed.
        boundingBoxOptions: {
            // same as https://js.cytoscape.org/#eles.boundingBox, used when calculating if one node is dragged over another
            includeOverlays: false,
            includeLabels: true,
        },
        overThreshold: 10, // make dragging over a drop target easier by expanding the hit area by this amount on all sides
        outThreshold: 10, // make dragging out of a drop target a bit harder by expanding the hit area by this amount on all sides
    };

    //register edge handles
    network._edgeHandles = network._graph.edgehandles(edgehandlesOptions);

    //register context menu
    // network._menu = network._graph.contextMenus(menuOptions);

    network._cdnd = network._graph.compoundDragAndDrop(subnettingOptions);
    network._cdnd.disable();

    //TODO: custom badge for extensions (e.g. firewall)
    network._graph.nodeHtmlLabel([
        {
            query: '.default-gateway-not-found',
            valign: 'top',
            halign: 'right',
            tpl: function () {
                return `<sl-icon src="resources/icons/no-internet.svg">`;
            },
        },
    ]);

    network._graph.on('tapend', '.router-node', function (event: EventObject) {
        console.log(event.target);
        if (!network.subnettingController.assignGatewayOn) return;
        network.subnettingController.addGateway(event, network);
    });

    //handle database and port assignment on removing node/edge
    network._graph.on('remove', 'node', (event: EventObject) => {
        GraphNodeFactory.removeNode(event.target, network);
    });
    network._graph.on('remove', 'edge', (event: EventObject) => {
        EdgeController.removeConnection(event.target.data(), network._graph);
    });

    //fit graph view to container => should be done using cy.ready() 
    setTimeout(() => { 
        network._graph.fit();
    },100); 

}
