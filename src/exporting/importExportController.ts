import SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.component.js';
import { html } from 'lit';
import { NodeSingular, EdgeSingular } from 'cytoscape';
import { NetworkComponent } from '..';
import { Ipv4Address } from '../adressing/Ipv4Address';
import { Ipv6Address } from '../adressing/Ipv6Address';
import { MacAddress } from '../adressing/MacAddress';
import { RoutableDecorator } from '../components/dataDecorators/Routable';
import { SwitchableDecorator } from '../components/dataDecorators/Switchable';
import { GraphEdge } from '../components/GraphEdge';
import { Net } from '../components/logicalNodes/Net';
import { AccessPoint, Bridge, Hub, Repeater, Router, Switch } from '../components/physicalNodes/Connector';
import { Host } from '../components/physicalNodes/Host';
import { ConnectionType, PhysicalNode } from '../components/physicalNodes/PhysicalNode';
import { initNetwork } from '../network-config';
import { RoutingData } from '../utils/routingData';
import { TableHelper } from '../utils/TableHelper';
import { msg } from '@lit/localize';

class ExampleDescription {
    id: number;
    previewPath: string;
    filePath: string;
    helpText: string;

    constructor(id: number, previewPath: string, filePath: string, helpText: string) {
        this.id = id;
        this.previewPath = previewPath;
        this.filePath = filePath;
        this.helpText = helpText;
    }
}

export class ImportExportController {
    static reader: FileReader = new FileReader();

    static exportFile(network: NetworkComponent): void {
        if (!network.networkAvailable) return;
        let data: Record<string, any> = {};
        let physicalNodes: any[] = [];
        let logicalNodes: any[] = [];
        let edges: any[] = [];

        network._graph.nodes('.physical-node').forEach((e: NodeSingular) => {
            let i: Record<string, any> = {};
            i['dataExport'] = e.data();
            i['dataExport']['cssClass'] = e.classes() as string[];
            let portData: any[] = [];
            let portLink: any[] = [];
            let portNet: any[] = [];
            let nets: any[] = [];
            (e.data() as PhysicalNode).portData.forEach((values, port) => {
                let newData: Record<string, any> = {};
                newData['Name'] = values.get('Name');
                newData['Connection Type'] = values.get('Connection Type');
                newData['MAC'] = values.get('MAC');
                newData['IPv4'] = values.get('IPv4');
                newData['IPv6'] = values.get('IPv6');

                newData['index'] = port;
                portData.push(newData);
            });
            (e.data() as PhysicalNode).portLinkMapping.forEach((data, port) => {
                let newData: Record<string, any> = {};
                newData['index'] = port;
                newData['linkId'] = data;
                portLink.push(newData);
            });

            if (e.hasClass('gateway-node')) {
                let gateway: Router = e.data();
                if (gateway.portNetMapping.size != 0) {
                    gateway.portNetMapping.forEach((net, port) => {
                        let newData: Record<string, any> = {};
                        newData['index'] = port;
                        newData['netId'] = net.id;
                        portNet.push(newData);
                    });
                }
                if (gateway.nets.length != 0) {
                    gateway.nets.forEach((net: any) => {
                        let newData: Record<string, any> = {};
                        newData['netId'] = net.id;
                        nets.push(newData);
                    });
                }
            }
            if (e.hasClass('decorated-node')) {
                let newCss: string[] = (e.classes() as string[]).filter((css) => !css.includes('decorated'));
                i['dataExport']['cssClass'] = newCss;
            }

            i['portData'] = portData;
            i['portLink'] = portLink;
            i['position'] = e.position();
            i['portNet'] = portNet;
            i['nets'] = nets;
            physicalNodes.push(i);
        });
        network._graph.nodes('.net-node').forEach((e: NodeSingular) => {
            let i: Record<string, any> = {};
            let gateways: any[] = [];
            i['dataExport'] = e.data();
            i['dataExport']['cssClass'] = e.classes() as string[];
            i['position'] = e.position();
            e.data('gateways').forEach((port: any, gatewayNodeId: any) => {
                let e: Record<string, any> = {};
                e['port'] = port;
                e['gatewayNodeId'] = gatewayNodeId;
                gateways.push(e);
            });
            i['gateways'] = gateways;
            logicalNodes.push(i);
        });
        network._graph.edges().forEach((e: EdgeSingular) => {
            let i: Record<string, any> = {};
            i['dataExport'] = e.data();
            i['dataExport']['cssClass'] = e.classes() as string[];
            edges.push(i);
        });

        if (network.packetSimulator.inited) {
            data['inited'] = true;
            let switchableTables: any[] = [];
            network._graph.nodes('.switchable-decorated').forEach((e: NodeSingular) => {
                let i: Record<string, any> = {};
                let switchable: SwitchableDecorator = e.data();
                i['id'] = switchable.id;
                let table: any[] = [];
                if (switchable.macAddressTable.size > 0) {
                    switchable.macAddressTable.forEach((port, mac) => {
                        let row: Record<string, any> = {};
                        row['port'] = port;
                        row['mac'] = mac;
                        table.push(row);
                    });
                }
                i['table'] = table;
                switchableTables.push(i);
            });

            let routableTables: any[] = [];
            network._graph.nodes('.routable-decorated').forEach((e: NodeSingular) => {
                let i: Record<string, any> = {};
                let routable: RoutableDecorator = e.data();
                i['id'] = routable.id;
                let arpTable: any[] = [];
                if (routable.arpTableIpMac.size > 0) {
                    routable.arpTableIpMac.forEach((mac, ip) => {
                        let row: Record<string, any> = {};
                        row['ip'] = ip;
                        row['mac'] = mac;
                        arpTable.push(row);
                    });
                }
                i['arpTable'] = arpTable;

                let routingTable: any[] = [];
                if (routable.routingTable.size > 0) {
                    routable.routingTable.forEach((routingData) => {
                        let row: Record<string, any> = {};
                        row['destination'] = routingData.destination;
                        row['gateway'] = routingData.gateway;
                        row['interfaceName'] = routingData.interfaceName;
                        row['bitmask'] = routingData.bitmask;
                        row['netmask'] = routingData.netmask;
                        row['port'] = routingData.port;
                        routingTable.push(row);
                    });
                }
                i['routingTable'] = routingTable;
                routableTables.push(i);
            });
            data['switchable'] = switchableTables;
            data['routable'] = routableTables;
        }

        data['physical-nodes'] = physicalNodes;
        data['logical-nodes'] = logicalNodes;
        data['edges'] = edges;

        let myblob = new Blob([JSON.stringify(data)], {
            type: 'application/json',
        });
        let url = URL.createObjectURL(myblob);
        ImportExportController.download(url, 'network-graph-' + Date.now() + '.json');
    }

    static download(path: string, filename: string): void {
        // Create a new link
        const anchor = document.createElement('a');
        anchor.href = path;
        anchor.download = filename;

        // Append to the DOM
        document.body.appendChild(anchor);

        // Trigger `click` event
        anchor.click();

        // Remove element from DOM
        document.body.removeChild(anchor);
    }

    static importFile(network: NetworkComponent): void {
        const fileInput = network.renderRoot.querySelector('#import-file') as HTMLInputElement;
        const selectedFile = fileInput.files![0];
        ImportExportController.importSpecificFile(selectedFile, network);
    }

    static importSpecificFile(selectedFile: File, network: NetworkComponent): void {
        ImportExportController.reader.onloadend = async () => {
            initNetwork(network);
            network.ipv4Database = new Map();
            network.macDatabase = new Map();
            network.ipv6Database = new Map();

            let json: any;
            if (typeof ImportExportController.reader.result === 'string') {
                json = JSON.parse(ImportExportController.reader.result);
            }
            json['logical-nodes'].forEach((net: any) => {
                let ad: string = net['dataExport'].hasOwnProperty('networkAddress')
                    ? net['dataExport']['networkAddress']['address']
                    : null;
                let data: Net = new Net(
                    net['dataExport']['color'],
                    ad,
                    net['dataExport']['netmask'],
                    net['dataExport']['bitmask'],
                    network.ipv4Database,
                    net['dataExport']['id']
                );
                data.cssClass = net['dataExport']['cssClass'];
                if (net['gateways'].length != 0) {
                    net['gateways'].forEach((p: any) => {
                        data.gateways.set(p['gatewayNodeId'], p['port']);
                    });
                }

                if (net['dataExport'].hasOwnProperty('parent')) {
                    data.parent = net['dataExport']['parent'];

                    network._graph.add({
                        group: 'nodes',
                        data: data,
                        classes: data.cssClass,
                        position: net['position'],
                        parent: network._graph.$('#' + net['dataExport']['parent']),
                    });
                } else {
                    network._graph.add({
                        group: 'nodes',
                        data: data,
                        classes: data.cssClass,
                        position: net['position'],
                    });
                }
            });

            json['physical-nodes'].forEach((element: any) => {
                let data!: PhysicalNode;
                let cssClasses: string[] = element['dataExport']['cssClass'];
                let nameMap: Map<number, string> = new Map();
                let connectionMap: Map<number, ConnectionType> = new Map();
                let macMap: Map<number, MacAddress> = new Map();
                let ipv4Map: Map<number, Ipv4Address> = new Map();
                let ipv6Map: Map<number, Ipv6Address> = new Map();

                element['portData'].forEach((p: any) => {
                    nameMap.set(p['index'], p['Name']);
                    connectionMap.set(p['index'], p['Connection Type']);
                    if (p.hasOwnProperty('MAC')) {
                        let mac: MacAddress = MacAddress.validateAddress(p['MAC']['address'], network.macDatabase)!;
                        macMap.set(p['index'], mac);
                        MacAddress.addAddressToDatabase(mac, network.macDatabase, element['dataExport']['id']);
                    }
                    if (p.hasOwnProperty('IPv4')) {
                        let ip4: Ipv4Address = Ipv4Address.validateAddress(p['IPv4']['address'], network.ipv4Database)!;
                        ipv4Map.set(p['index'], ip4);
                        Ipv4Address.addAddressToDatabase(ip4, network.ipv4Database, element['dataExport']['id']);
                    }
                    if (p.hasOwnProperty('IPv6')) {
                        let ip6: Ipv6Address = Ipv6Address.validateAddress(p['IPv6']['address'], network.ipv6Database)!;
                        ipv6Map.set(p['index'], ip6);
                        Ipv6Address.addAddressToDatabase(ip6, network.ipv6Database, element['dataExport']['id']);
                    }
                });

                if (cssClasses.includes('router-node')) {
                    data = new Router(
                        element['dataExport']['color'],
                        element['dataExport']['numberOfInterfacesOrPorts'],
                        nameMap,
                        connectionMap,
                        macMap,
                        ipv4Map,
                        ipv6Map,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('repeater-node')) {
                    data = new Repeater(
                        element['dataExport']['color'],
                        connectionMap,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('hub-node')) {
                    data = new Hub(
                        element['dataExport']['color'],
                        element['dataExport']['numberOfInterfacesOrPorts'],
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('switch-node')) {
                    data = new Switch(
                        element['dataExport']['color'],
                        element['dataExport']['numberOfInterfacesOrPorts'],
                        macMap,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('bridge-node')) {
                    data = new Bridge(
                        element['dataExport']['color'],
                        connectionMap,
                        macMap,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('access-point-node')) {
                    data = new AccessPoint(
                        element['dataExport']['color'],
                        element['dataExport']['numberOfInterfacesOrPorts'],
                        macMap,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                } else if (cssClasses.includes('host-node')) {
                    data = new Host(
                        element['dataExport']['color'],
                        element['dataExport']['backgroundPath'].split('/')[7].split('.')[0],
                        element['dataExport']['numberOfInterfacesOrPorts'],
                        nameMap,
                        connectionMap,
                        macMap,
                        ipv4Map,
                        ipv6Map,
                        element['dataExport']['name'],
                        element['dataExport']['id']
                    );
                }

                element['portLink'].forEach((p: any) => {
                    data.portLinkMapping.set(p['index'], p['linkId']);
                });

                data.cssClass = cssClasses;
                data.defaultGateway = element['dataExport']['defaultGateway'];

                if (data instanceof Router && cssClasses.includes('gateway-node')) {
                    element['portNet'].forEach((p: any) => {
                        (data as Router).portNetMapping.set(
                            p['index'],
                            network._graph.$('#' + p['netId']).data() as Net
                        );
                    });
                    element['nets'].forEach((p: any) => {
                        (data as Router).nets.push(network._graph.$('#' + p['netId']).data() as Net);
                    });
                }

                if (element['dataExport'].hasOwnProperty('parent')) {
                    data.parent = element['dataExport']['parent'];

                    network._graph.add({
                        group: 'nodes',
                        data: data,
                        classes: data.cssClass,
                        position: element['position'],
                        parent: network._graph.$('#' + element['dataExport']['parent']),
                    });
                } else {
                    network._graph.add({
                        group: 'nodes',
                        data: data,
                        classes: element['dataExport']['cssClass'],
                        position: element['position'],
                    });
                }
            });

            json['edges'].forEach((edge: any) => {
                let graphEdge: GraphEdge = new GraphEdge(
                    edge['dataExport']['color'],
                    network._graph.$('#' + edge['dataExport']['source']).data() as PhysicalNode,
                    network._graph.$('#' + edge['dataExport']['target']).data() as PhysicalNode
                );

                GraphEdge.addPorts(graphEdge, edge['dataExport']['inPort'], edge['dataExport']['outPort']);

                graphEdge.cssClass = edge['dataExport']['cssClass'];

                network._graph.add({
                    group: 'edges',
                    data: graphEdge,
                    classes: graphEdge.cssClass,
                });
            });

            if (json.hasOwnProperty('inited')) {
                network.packetSimulator.inited = false;
                network.packetSimulator.initSession(network);
            } else {
                const container = TableHelper.tableContainer(network);
                if (container != null) container.innerHTML = '';
            }

            if (json.hasOwnProperty('switchable')) {
                json['switchable'].forEach((element: any) => {
                    let rows: any[] = element['table'];
                    let map: Map<string, number> = (network._graph.$('#' + element['id']).data() as SwitchableDecorator)
                        .macAddressTable;
                    rows.forEach((row) => {
                        map.set(row['mac'], +row['port']);
                        TableHelper.addRow('mac-address-table-' + element['id'], 'MacAddressTable', network, [
                            row['port'],
                            row['mac'],
                        ]);
                    });
                });
            }
            if (json.hasOwnProperty('routable')) {
                json['routable'].forEach((element: any) => {
                    let routingRows: any[] = element['routingTable'];
                    let routingMap: Map<string, RoutingData> = (
                        network._graph.$('#' + element['id']).data() as RoutableDecorator
                    ).routingTable;
                    routingRows.forEach((row) => {
                        routingMap.set(
                            row['destination'],
                            new RoutingData(
                                row['destination'],
                                row['gateway'],
                                +row['bitmask'],
                                row['interfaceName'],
                                +row['port']
                            )
                        );
                        TableHelper.addRow('routing-table-' + element['id'], 'RoutingTable', network, [
                            row['destination'],
                            row['gateway'],
                            +row['bitmask'],
                            +row['port'],
                        ]);
                    });

                    let arpRows: any[] = element['arpTable'];
                    let arpMapIpMac: Map<string, string> = (
                        network._graph.$('#' + element['id']).data() as RoutableDecorator
                    ).arpTableIpMac;
                    let arpMapMacIp: Map<string, string> = (
                        network._graph.$('#' + element['id']).data() as RoutableDecorator
                    ).arpTableMacIp;

                    arpRows.forEach((row) => {
                        arpMapIpMac.set(row['ip'], row['mac']);
                        arpMapMacIp.set(row['mac'], row['ip']);
                        TableHelper.addRow('arp-table-' + element['id'], 'ArpTable', network, [row['ip'], row['mac']]);
                    });
                });
            }
        };

        ImportExportController.reader.readAsText(selectedFile, 'UTF-8');
    }

    static cidrs: Map<string, ExampleDescription> = new Map<string, ExampleDescription>([
        [
            'Example 1',
            new ExampleDescription(
                1,
                'resources/preview-examples/CIDR-and-classful-drag&drop--then-check.png',
                'resources/examples/CIDR-and-classful-drag&drop--then-check.json',
                msg('An exercise for CIDR from classful networks: drag and drop then check.')
            ),
        ],
        [
            'Example 2',
            new ExampleDescription(
                2,
                'resources/preview-examples/CIDR-fill-in-the-blank.png',
                'resources/examples/CIDR-fill-in-the-blank.json',
                msg('An exercise for CIDR from classful networks: configure the classful networks then check.')
            ),
        ],
        [
            'Example 3',
            new ExampleDescription(
                3,
                'resources/preview-examples/subnetting-fill-in-the-blank.png',
                'resources/examples/subnetting-fill-in-the-blank.json',
                msg('An exercise for subnetting from a classful network: configure the subnets then check.')
            ),
        ],
        [
            'Example 4',
            new ExampleDescription(
                4,
                'resources/preview-examples/cidr-subnetting-drag&drop.png',
                'resources/examples/cidr-subnetting-drag&drop.json',
                msg('A mixed exercise of CIDR and subnetting: drag and drop then check.')
            ),
        ],
    ]); //id, example-info

    static simulations: Map<string, ExampleDescription> = new Map<string, ExampleDescription>([
        [
            'Example 1',
            new ExampleDescription(
                1,
                'resources/preview-examples/repeater-simulation.png',
                'resources/examples/repeater-simulation.json',
                msg('Ethernet with a repeater and 2 hosts.')
            ),
        ],
        [
            'Example 2',
            new ExampleDescription(
                2,
                'resources/preview-examples/hub-simulation.png',
                'resources/examples/hub-simulation.json',
                msg('Ethernet with a hub and 3 hosts.')
            ),
        ],
        [
            'Example 3',
            new ExampleDescription(
                3,
                'resources/preview-examples/bridge-simulation.png',
                'resources/examples/bridge-simulation.json',
                msg('Ethernet with a bridge and 2 hosts.')
            ),
        ],
        [
            'Example 4',
            new ExampleDescription(
                4,
                'resources/preview-examples/switch-simulation.png',
                'resources/examples/switch-simulation.json',
                msg('Ethernet with a switch and 3 hosts.')
            ),
        ],
        [
            'Example 5',
            new ExampleDescription(
                5,
                'resources/preview-examples/accesspoint-simulation.png',
                'resources/examples/accesspoint-simulation.json',
                msg('Wifi network with 1 access point, 3 hosts.')
            ),
        ],
        [
            'Example 6',
            new ExampleDescription(
                6,
                'resources/preview-examples/gateway-2ethernet.png',
                'resources/examples/gateway-2ethernet.json',
                msg('2 Ethernets with a gateway.')
            ),
        ],
        [
            'Example 7',
            new ExampleDescription(
                7,
                'resources/preview-examples/gateway-2net-wireless-ethernet.png',
                'resources/examples/gateway-2net-wireless-ethernet.json',
                msg('An ethernet, a wireless network and a gateway.')
            ),
        ],
        [
            'Example 8',
            new ExampleDescription(
                8,
                'resources/preview-examples/gateway-3ethernet.png',
                'resources/examples/gateway-3ethernet.json',
                msg('3 Ethernets and a gateway.')
            ),
        ],
        [
            'Example 9',
            new ExampleDescription(
                9,
                'resources/preview-examples/3gateways - next gateway routes.png',
                'resources/examples/3gateways - next gateway routes.json',
                msg('2 Ethernets and 3 routers.')
            ),
        ],
        [
            'Example 10',
            new ExampleDescription(
                10,
                'resources/preview-examples/4 routers-2 nets.png',
                'resources/examples/4 routers-2 nets.json',
                msg('2 Ethernets and 4 routers.')
            ),
        ],
    ]); //id, example-info

    static openExample(filePath: string, network: NetworkComponent) {
        console.log('open Example');
        fetch(filePath).then((response) => {
            response.blob().then((blob) => {
                const file = new File([blob], 'temporal.json', { type: blob.type });
                console.log(file);
                ImportExportController.importSpecificFile(file, network);
            });
        });
        (network.renderRoot.querySelector('#example-graphs') as SlDialog).hide();
    }

    static exampleTemplate(network: NetworkComponent) {
        let cidrExamples: any[] = [];
        let simulationExamples: any[] = [];

        ImportExportController.cidrs.forEach((value, name) => {
            cidrExamples.push(html`
                <sl-card class="card-overview">
                    <img slot="image" src=${value.previewPath} alt=${name} />
                    ${value.helpText}
                    <div slot="footer">
                        <sl-button pill @click="${() => ImportExportController.openExample(value.filePath, network)}"
                            >${msg('Open')}</sl-button
                        >
                    </div>
                </sl-card>
            `);
        });

        ImportExportController.simulations.forEach((value, name) => {
            simulationExamples.push(html`
                <sl-card class="card-overview">
                    <img slot="image" src=${value.previewPath} alt=${name} />
                    ${value.helpText}
                    <div slot="footer">
                        <sl-button pill @click="${() => ImportExportController.openExample(value.filePath, network)}"
                            >${msg('Open')}</sl-button
                        >
                    </div>
                </sl-card>
            `);
        });

        return html`
            <sl-tab-group>
                <sl-tab slot="nav" panel="cidr">${msg('Example exercises for CIDR/ Subnetting')}</sl-tab>
                <sl-tab slot="nav" panel="simulation">${msg('Example networks for simulations')}</sl-tab>

                <sl-tab-panel name="cidr"
                    >${msg('Tip: Use the CIDR/Subnetting controller to drag-and-drop then check.')}
                    ${msg('Right-click on each network, then select Edit details to change its configuration.')}
                    <br /><br />
                    ${cidrExamples}</sl-tab-panel
                >
                <sl-tab-panel name="simulation"
                    >${msg('Tip: Set source and destination then click on play button in')}
                    ${msg('Packet sending controller to start simulation')}
                    <br /><br />
                    ${simulationExamples}</sl-tab-panel
                >
            </sl-tab-group>
        `;
    }
}
