import type { Diagram } from './diagram';
import { Ipv4Address } from './addressing/ipv4-address';
import { Ipv6Address } from './addressing/ipv6-address';
import { MacAddress } from './addressing/mac-address';
import { GraphEdge } from './graph-edge';
import { Net } from './logical-nodes/net';
import { computerNode, mobileNode } from './node-graphics';
import { AccessPoint, Bridge, Hub, Repeater, Router, Switch } from './physical-nodes/connector';
import { Host } from './physical-nodes/host';
import { ConnectionType, PhysicalNode } from './physical-nodes/physical-node';
import { RoutingData } from './routing-data';
import { RoutableDecorator } from './simulation/routable';
import { SwitchableDecorator } from './simulation/switchable';

/** Reads from a JSON file whose shape this widget wrote itself. */
type Json = any;

const withoutDecorated = (classes: string[]) => classes.filter((name) => !name.includes('decorated'));

function exportPhysicalNode(node: PhysicalNode): Json {
    const portData: Json[] = [];
    node.portData.forEach((values, port) => {
        portData.push({
            Name: values.get('Name'),
            'Connection Type': values.get('Connection Type'),
            MAC: values.get('MAC'),
            IPv4: values.get('IPv4'),
            IPv6: values.get('IPv6'),
            index: port,
        });
    });
    const portLink: Json[] = [];
    node.portLinkMapping.forEach((linkId, port) => portLink.push({ index: port, linkId }));

    const portNet: Json[] = [];
    const nets: Json[] = [];
    if (node.has('gateway-node')) {
        const gateway = node as Router;
        gateway.portNetMapping.forEach((net, port) => portNet.push({ index: port, netId: net.id }));
        gateway.nets.forEach((net) => nets.push({ netId: net.id }));
    }

    return {
        dataExport: {
            id: node.id,
            name: node.name,
            color: node.color,
            layer: node.layer,
            numberOfInterfacesOrPorts: node.numberOfInterfacesOrPorts,
            backgroundPath: node.backgroundPath,
            defaultGateway: node.defaultGateway,
            parent: node.parent,
            cssClass: withoutDecorated(node.cssClass),
        },
        portData,
        portLink,
        position: { x: node.x, y: node.y },
        portNet,
        nets,
    };
}

/** The content of a network file: what the diagram holds, and the tables of a running simulation. */
export function exportNetworkFile(diagram: Diagram, inited: boolean): Json {
    const data: Json = {};

    const physicalNodes = diagram.physicalNodes().map(exportPhysicalNode);
    const logicalNodes = diagram.nets().map((net) => ({
        dataExport: {
            id: net.id,
            name: net.name,
            color: net.color,
            netmask: net.netmask,
            bitmask: net.bitmask,
            binaryNetmask: net.binaryNetmask,
            networkAddress: net.networkAddress,
            parent: net.parent,
            cssClass: [...net.cssClass],
        },
        position: { x: net.x, y: net.y },
        gateways: [...net.gateways].map(([gatewayNodeId, port]) => ({ port, gatewayNodeId })),
    }));
    const edges = [...diagram.edges.values()].map((edge) => ({
        dataExport: {
            id: edge.id,
            color: edge.color,
            source: edge.source,
            target: edge.target,
            inPort: edge.inPort,
            outPort: edge.outPort,
            cssClass: [...edge.cssClass],
        },
    }));

    if (inited) {
        data['inited'] = true;
        data['switchable'] = diagram
            .physicalNodes()
            .filter((node): node is SwitchableDecorator => node instanceof SwitchableDecorator)
            .map((node) => ({
                id: node.id,
                table: [...node.macAddressTable].map(([mac, port]) => ({ port, mac })),
            }));
        data['routable'] = diagram
            .physicalNodes()
            .filter((node): node is RoutableDecorator => node instanceof RoutableDecorator)
            .map((node) => ({
                id: node.id,
                arpTable: [...node.arpTableIpMac].map(([ip, mac]) => ({ ip, mac })),
                routingTable: [...node.routingTable.values()].map((row) => ({
                    destination: row.destination,
                    gateway: row.gateway,
                    interfaceName: row.interfaceName,
                    bitmask: row.bitmask,
                    netmask: row.netmask,
                    port: row.port,
                })),
            }));
    }

    data['physical-nodes'] = physicalNodes;
    data['logical-nodes'] = logicalNodes;
    data['edges'] = edges;
    return data;
}

function importPhysicalNode(diagram: Diagram, element: Json): PhysicalNode | undefined {
    const info = element['dataExport'];
    const cssClasses: string[] = info['cssClass'] ?? [];
    const nameMap: Map<number, string> = new Map();
    const connectionMap: Map<number, ConnectionType> = new Map();
    const macMap: Map<number, MacAddress> = new Map();
    const ipv4Map: Map<number, Ipv4Address> = new Map();
    const ipv6Map: Map<number, Ipv6Address> = new Map();

    element['portData'].forEach((p: Json) => {
        nameMap.set(p['index'], p['Name']);
        connectionMap.set(p['index'], p['Connection Type']);
        if (p.hasOwnProperty('MAC')) {
            const mac: MacAddress = MacAddress.validateAddress(p['MAC']['address'], diagram.macDatabase)!;
            macMap.set(p['index'], mac);
            MacAddress.addAddressToDatabase(mac, diagram.macDatabase, info['id']);
        }
        if (p.hasOwnProperty('IPv4')) {
            const ip4: Ipv4Address = Ipv4Address.validateAddress(p['IPv4']['address'], diagram.ipv4Database)!;
            ipv4Map.set(p['index'], ip4);
            Ipv4Address.addAddressToDatabase(ip4, diagram.ipv4Database, info['id']);
        }
        if (p.hasOwnProperty('IPv6')) {
            const ip6: Ipv6Address = Ipv6Address.validateAddress(p['IPv6']['address'], diagram.ipv6Database)!;
            ipv6Map.set(p['index'], ip6);
            Ipv6Address.addAddressToDatabase(ip6, diagram.ipv6Database, info['id']);
        }
    });

    const { color, numberOfInterfacesOrPorts: ports, name, id } = info;
    let data: PhysicalNode;
    if (cssClasses.includes('router-node')) {
        data = new Router(color, ports, nameMap, connectionMap, macMap, ipv4Map, ipv6Map, name, id);
    } else if (cssClasses.includes('repeater-node')) {
        data = new Repeater(color, connectionMap, name, id);
    } else if (cssClasses.includes('hub-node')) {
        data = new Hub(color, ports, name, id);
    } else if (cssClasses.includes('switch-node')) {
        data = new Switch(color, ports, macMap, name, id);
    } else if (cssClasses.includes('bridge-node')) {
        data = new Bridge(color, connectionMap, macMap, name, id);
    } else if (cssClasses.includes('access-point-node')) {
        data = new AccessPoint(color, ports, macMap, name, id);
    } else if (cssClasses.includes('host-node')) {
        const picture = info['backgroundPath'] === mobileNode ? mobileNode : computerNode;
        data = new Host(color, picture, ports, nameMap, connectionMap, macMap, ipv4Map, ipv6Map, name, id);
    } else {
        return undefined;
    }

    element['portLink'].forEach((p: Json) => data.portLinkMapping.set(p['index'], p['linkId']));

    data.cssClass = cssClasses;
    data.defaultGateway = info['defaultGateway'];
    if (info['parent'] != null) data.parent = info['parent'];
    return data;
}

/** Fills an empty diagram with the content of a network file. */
export function importNetworkFile(diagram: Diagram, json: Json): void {
    json['logical-nodes'].forEach((net: Json) => {
        const info = net['dataExport'];
        const address: string = info.hasOwnProperty('networkAddress') && info['networkAddress'] ? info['networkAddress']['address'] : null;
        const data = new Net(info['color'], address, info['netmask'], info['bitmask'], diagram.ipv4Database, info['id'], diagram);
        data.cssClass = info['cssClass'];
        net['gateways'].forEach((p: Json) => data.gateways.set(p['gatewayNodeId'], p['port']));
        if (info['parent'] != null) data.parent = info['parent'];
        diagram.add(data, net['position'].x, net['position'].y);
    });

    json['physical-nodes'].forEach((element: Json) => {
        const data = importPhysicalNode(diagram, element);
        if (!data) return;

        if (data instanceof Router && data.cssClass.includes('gateway-node')) {
            element['portNet'].forEach((p: Json) => {
                const net = diagram.node<Net>(p['netId']);
                if (net) data.portNetMapping.set(p['index'], net);
            });
            element['nets'].forEach((p: Json) => {
                const net = diagram.node<Net>(p['netId']);
                if (net) data.nets.push(net);
            });
        }
        diagram.add(data, element['position'].x, element['position'].y);
    });

    json['edges'].forEach((edge: Json) => {
        const info = edge['dataExport'];
        const from = diagram.node<PhysicalNode>(info['source']);
        const to = diagram.node<PhysicalNode>(info['target']);
        if (!from || !to) return;

        const graphEdge = new GraphEdge(info['color'], from, to, info['id']);
        GraphEdge.addPorts(graphEdge, info['inPort'], info['outPort'], diagram);
        graphEdge.cssClass = info['cssClass'] ?? graphEdge.cssClass;
        diagram.addEdge(graphEdge);
    });
}

/** Puts the tables of a file back into a simulation that was started for the imported diagram. */
export function importTables(diagram: Diagram, json: Json): void {
    (json['switchable'] ?? []).forEach((element: Json) => {
        const node = diagram.node<SwitchableDecorator>(element['id']);
        if (!(node instanceof SwitchableDecorator)) return;
        element['table'].forEach((row: Json) => node.macAddressTable.set(row['mac'], +row['port']));
    });
    (json['routable'] ?? []).forEach((element: Json) => {
        const node = diagram.node<RoutableDecorator>(element['id']);
        if (!(node instanceof RoutableDecorator)) return;
        element['routingTable'].forEach((row: Json) => {
            node.routingTable.set(
                row['destination'],
                new RoutingData(row['destination'], row['gateway'], +row['bitmask'], row['interfaceName'], +row['port'])
            );
        });
        element['arpTable'].forEach((row: Json) => {
            node.arpTableIpMac.set(row['ip'], row['mac']);
            node.arpTableMacIp.set(row['mac'], row['ip']);
        });
    });
}
