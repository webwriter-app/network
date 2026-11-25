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
import { dropIntoNet, setUpGateway } from './subnetting';

export type Component = {
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;

    color: string;

    ports: Port[];
    portLinks: string[];

    defaultGateway?: [string, number] | null;
};

type Port = {
    name: string;
    type: string;
    mac: string;
    ip4?: string;
    ip6?: string;
};

export type Connection = {
    id: string;
    from: string;
    to: string;
    inPort: number;
    outPort: number;

    color: string;
};

export type Network = {
    id: string;
    components: string[];
    gateways: string[];
    name: string;
    netmask: string;
    bitmask: number;
    address: string;

    currentDefaultGateway?: string | null;

    x: number;
    y: number;

    color: string;
};

export type NetworkData = { components: Component[]; connections: Connection[]; networks: Network[] };

/** Builds the diagram described by the saved data. The diagram is expected to be empty. */
export function loadDiagram(diagram: Diagram, { components, connections, networks }: NetworkData): void {
    components.forEach((c) => {
        const portNames: Map<number, string> = new Map();
        const portConnectionTypes: Map<number, ConnectionType> = new Map();
        const portMacs: Map<number, MacAddress> = new Map();
        const portIpv4s: Map<number, Ipv4Address> = new Map();
        const portIpv6s: Map<number, Ipv6Address> = new Map();

        c.ports.forEach((p, index) => {
            portNames.set(index + 1, p.name);
            portConnectionTypes.set(index + 1, p.type as ConnectionType);
            portMacs.set(index + 1, MacAddress.validateAddress(p.mac, diagram.macDatabase)!);
            portIpv4s.set(index + 1, Ipv4Address.validateAddress(p.ip4 || '', diagram.ipv4Database)!);
            portIpv6s.set(index + 1, Ipv6Address.validateAddress(p.ip6 || '', diagram.ipv6Database)!);
        });

        let component: PhysicalNode;
        switch (c.type) {
            case 'repeater':
                component = new Repeater(c.color, portConnectionTypes, c.name);
                break;
            case 'hub':
                component = new Hub(c.color, c.ports.length, c.name);
                break;
            case 'switch':
                component = new Switch(c.color, c.ports.length, portMacs, c.name);
                break;
            case 'bridge':
                component = new Bridge(c.color, portConnectionTypes, portMacs, c.name);
                break;
            case 'accesspoint':
                component = new AccessPoint(c.color, c.ports.length, portMacs, c.name);
                break;
            case 'router':
                component = new Router(c.color, c.ports.length, portNames, portConnectionTypes, portMacs, portIpv4s, portIpv6s, c.name);
                break;
            case 'computer':
                component = new Host(c.color, computerNode, c.ports.length, portNames, portConnectionTypes, portMacs, portIpv4s, portIpv6s, c.name);
                break;
            case 'mobile':
                component = new Host(c.color, mobileNode, c.ports.length, portNames, portConnectionTypes, portMacs, portIpv4s, portIpv6s, c.name);
                break;
            default:
                return;
        }

        component.id = c.id;

        if (component.layer >= 2) {
            portMacs.forEach((mac) => {
                if (mac != null) MacAddress.addAddressToDatabase(mac, diagram.macDatabase, component.id);
            });
        }
        if (component.layer >= 3) {
            portIpv4s.forEach((ip4) => {
                if (ip4 != null) Ipv4Address.addAddressToDatabase(ip4, diagram.ipv4Database, component.id);
            });
            portIpv6s.forEach((ip6) => {
                if (ip6 != null) Ipv6Address.addAddressToDatabase(ip6, diagram.ipv6Database, component.id);
            });
        }

        if (c.defaultGateway) {
            component.defaultGateway = c.defaultGateway;
        }

        diagram.add(component, c.x, c.y);
    });

    connections.forEach((c) => {
        const from = diagram.node<PhysicalNode>(c.from);
        const to = diagram.node<PhysicalNode>(c.to);
        if (!from || !to) return;

        const edge = new GraphEdge(c.color || '#70e6af', from, to, c.id);
        diagram.addEdge(edge);

        if (c.inPort && c.outPort) {
            GraphEdge.addPorts(edge, c.inPort, c.outPort, diagram);
            setUpGateway(diagram, from.id, to.id, c.inPort);
            setUpGateway(diagram, to.id, from.id, c.outPort);
        }
    });

    networks.forEach((n) => {
        const net = Net.createNet(n.color, n.address, n.netmask, n.bitmask, diagram.ipv4Database, diagram, n.id);
        if (net == null) return;
        diagram.add(net, n.x, n.y);

        n.components.forEach((c) => {
            const component = diagram.node(c);
            if (!component) return;
            component.parent = net.id;
            dropIntoNet(diagram, component, net);
        });

        if (n.currentDefaultGateway) {
            const gateway = diagram.node(n.currentDefaultGateway);
            if (!gateway) return;
            const connection = connections.find(
                (c) => c.to === n.currentDefaultGateway || c.from === n.currentDefaultGateway
            );
            if (!connection) return;
            const port = connection.from === n.currentDefaultGateway ? connection.inPort : connection.outPort;
            net.currentDefaultGateway = [n.currentDefaultGateway, port];
        }
    });

    networks.forEach((n) => {
        const net = diagram.node<Net>(n.id);
        if (!net) return;

        n.gateways.forEach((g) => {
            const gateway = diagram.node<Router>(g);
            if (!gateway) return;

            gateway.nets = gateway.nets || [];
            gateway.nets.push(net);
            gateway.setClass('gateway-node', true);

            const connection = connections.find(
                (c) => (c.to === g && n.components.includes(c.from)) || (c.from === g && n.components.includes(c.to))
            );
            if (!connection) {
                net.gateways.set(gateway.id, null!); // add gateway to the net, with undefined port
                return;
            }
            const port = connection.from === g ? connection.inPort : connection.outPort;
            if (port === 0) return;
            const connectedComponent = connection.to === g ? connection.from : connection.to;
            net.gateways.set(gateway.id, port); // add gateway to the net, with port
            setUpGateway(diagram, gateway.id, connectedComponent, port);
        });
    });
}

function portsOf(node: PhysicalNode): Pick<Component, 'ports' | 'portLinks'> {
    const ports: Port[] = [];
    node.portData.forEach((port) => {
        ports.push({
            name: port.get('Name') || 'port',
            type: port.get('Connection Type') || 'ethernet',
            mac: (port.get('MAC') as MacAddress)?.address || '00:00:00:00:00:00',
            ip4: (port.get('IPv4') as Ipv4Address)?.address,
            ip6: (port.get('IPv6') as Ipv6Address)?.address,
        });
    });
    const portLinks: string[] = [];
    node.portLinkMapping.forEach((link) => portLinks.push(link || ''));
    return { ports, portLinks };
}

/** The data the diagram saves in the document. */
export function serializeDiagram(diagram: Diagram): NetworkData {
    const components: Component[] = diagram.physicalNodes().map((node) => {
        const component: Component = {
            id: node.id,
            name: node.name,
            color: node.color,
            type: node.kind,
            x: node.x,
            y: node.y,
            ...portsOf(node),
        };
        if (node.defaultGateway !== undefined) component.defaultGateway = node.defaultGateway;
        return component;
    });

    const connections: Connection[] = [...diagram.edges.values()].map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        inPort: edge.inPort ?? 0,
        outPort: edge.outPort ?? 0,
        color: edge.color,
    }));

    const networks: Network[] = diagram.nets().map((net) => {
        const network: Network = {
            id: net.id,
            components: diagram.childrenOf(net.id).map((child) => child.id),
            gateways: [...net.gateways.keys()],
            name: net.name,
            netmask: net.netmask,
            bitmask: net.bitmask,
            address: net.networkAddress?.address,
            color: net.color,
            x: net.x,
            y: net.y,
        };
        if (net.currentDefaultGateway) network.currentDefaultGateway = net.currentDefaultGateway[0];
        return network;
    });

    return { components, connections, networks };
}
