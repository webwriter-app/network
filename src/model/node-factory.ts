import type { Diagram } from './diagram';
import { Ipv4Address } from './addressing/ipv4-address';
import { Ipv6Address } from './addressing/ipv6-address';
import { MacAddress } from './addressing/mac-address';
import { AddressingHelper } from './addressing/addressing-helper';
import type { GraphNode } from './graph-node';
import { Net } from './logical-nodes/net';
import { computerNode, mobileNode } from './node-graphics';
import { AccessPoint, Bridge, Hub, Repeater, Router, Switch } from './physical-nodes/connector';
import { Host } from './physical-nodes/host';
import { ConnectionType, PhysicalNode } from './physical-nodes/physical-node';

export interface InterfaceData {
    name?: string;
    connectionType?: ConnectionType;
    mac?: string;
    ipv4?: string;
    ipv6?: string;
}

export interface PhysicalNodeData {
    componentType: string;
    color?: string;
    interfaces: Array<InterfaceData>;
}

export interface NetNodeData {
    componentType: 'net';
    color?: string;
    net: { netid: string; netmask: string; bitmask: number };
}

/** Where a node added from the toolbox appears. */
const NEW_NODE_AT = { x: 10, y: 10 };

/** Creates a net with the given CIDR settings and adds it to the diagram. Null if the settings do not allow a net. */
export function addNet(diagram: Diagram, data: NetNodeData): Net | null {
    const netid = data.net?.netid || '';
    const netmask = data.net?.netmask || '';
    const bitmask = data.net?.bitmask || 0;
    const color = data.color || '#70e6af';

    const net = Net.createNet(color, netid, netmask, bitmask, diagram.ipv4Database, diagram);
    if (net != null) diagram.add(net, NEW_NODE_AT.x, NEW_NODE_AT.y);
    return net;
}

/** Creates a host or connector with its interfaces, registers its addresses and adds it to the diagram. */
export function addPhysicalNode(diagram: Diagram, data: PhysicalNodeData): PhysicalNode | null {
    const numberOfPorts = data.interfaces.length;
    const color = data.color || '#70e6af';

    const names: Map<number, string> = new Map();
    const portConnectionTypes: Map<number, ConnectionType> = new Map();
    const portMacs: Map<number, MacAddress> = new Map();
    const portIpv4s: Map<number, Ipv4Address> = new Map();
    const portIpv6s: Map<number, Ipv6Address> = new Map();

    for (let index = 1; index <= numberOfPorts; index++) {
        const port = data.interfaces[index - 1];
        if (port.name) names.set(index, port.name);
        portConnectionTypes.set(index, port.connectionType || 'ethernet');
        portMacs.set(
            index,
            MacAddress.validateAddress(port.mac ?? '', diagram.macDatabase) ||
                MacAddress.generateRandomAddress(diagram.macDatabase)
        );

        switch (data.componentType) {
            case 'router':
            case 'computer':
            case 'mobile':
                portIpv4s.set(
                    index,
                    Ipv4Address.validateAddress(port.ipv4 ?? '', diagram.ipv4Database) || Ipv4Address.getLoopBackAddress()
                );
                portIpv6s.set(
                    index,
                    Ipv6Address.validateAddress(port.ipv6 ?? '', diagram.ipv6Database) || Ipv6Address.getLoopBackAddress()
                );
                break;
        }
    }

    let component: PhysicalNode;
    switch (data.componentType) {
        case 'repeater':
            component = new Repeater(color, portConnectionTypes, '');
            break;
        case 'hub':
            component = new Hub(color, numberOfPorts, '');
            break;
        case 'switch':
            component = new Switch(color, numberOfPorts, portMacs, '');
            break;
        case 'bridge':
            component = new Bridge(color, portConnectionTypes, portMacs, '');
            break;
        case 'access-point':
            component = new AccessPoint(color, numberOfPorts, portMacs, '');
            break;
        case 'router':
            component = new Router(color, numberOfPorts, names, portConnectionTypes, portMacs, portIpv4s, portIpv6s, '');
            break;
        case 'computer':
            component = new Host(color, computerNode, numberOfPorts, names, portConnectionTypes, portMacs, portIpv4s, portIpv6s, '');
            break;
        case 'mobile':
            component = new Host(color, mobileNode, numberOfPorts, names, portConnectionTypes, portMacs, portIpv4s, portIpv6s, '');
            break;
        default:
            return null;
    }

    registerAddresses(diagram, component, portMacs, portIpv4s, portIpv6s);
    diagram.add(component, NEW_NODE_AT.x, NEW_NODE_AT.y);
    return component;
}

function registerAddresses(
    diagram: Diagram,
    component: PhysicalNode,
    macs: Map<number, MacAddress>,
    ipv4s: Map<number, Ipv4Address>,
    ipv6s: Map<number, Ipv6Address>
): void {
    if (component.layer >= 2) {
        macs.forEach((mac) => MacAddress.addAddressToDatabase(mac, diagram.macDatabase, component.id));
    }
    if (component.layer >= 3) {
        ipv4s.forEach((ip4) => Ipv4Address.addAddressToDatabase(ip4, diagram.ipv4Database, component.id));
        ipv6s.forEach((ip6) => Ipv6Address.addAddressToDatabase(ip6, diagram.ipv6Database, component.id));
    }
}

/** Frees what a node held in the registries and in the nets and gateways around it. Called by `Diagram.removeNode`. */
export function releaseNode(diagram: Diagram, node: GraphNode): void {
    if (node.has('net-node')) {
        releaseNet(diagram, node as Net);
    } else if (node.has('gateway-node')) {
        releaseGateway(diagram, node as Router);
    } else if (node.has('physical-node')) {
        const physicalNode = node as PhysicalNode;
        if (physicalNode.layer > 2) {
            physicalNode.portData.forEach((data) => {
                diagram.ipv4Database.delete(data.get('IPv4').address);
            });
        }
    }
}

function releaseGateway(diagram: Diagram, gateway: Router): void {
    gateway.portNetMapping.forEach((net, port) => {
        if (!net) return;
        net.gateways.delete(gateway.id);
        if (
            net.currentDefaultGateway != undefined &&
            net.currentDefaultGateway != null &&
            net.currentDefaultGateway[0] == gateway.id &&
            net.currentDefaultGateway[1] == port
        ) {
            const next = [...net.gateways.entries()].find(([, gatewayPort]) => gatewayPort != null);
            net.currentDefaultGateway = next ?? null!;
        }
        diagram.childrenOf(net.id).forEach((child) => {
            const host = child as PhysicalNode;
            const oldGateway = host.defaultGateway;
            if (oldGateway != null && oldGateway != undefined && oldGateway[0] == gateway.id && oldGateway[1] == port) {
                if (net.currentDefaultGateway != null && net.currentDefaultGateway != undefined) {
                    host.defaultGateway = net.currentDefaultGateway;
                } else {
                    host.defaultGateway = null;
                    host.setClass('default-gateway-not-found', true);
                }
            }
        });
    });

    gateway.portData.forEach((data) => {
        diagram.ipv4Database.delete(data.get('IPv4').address);
    });
}

function releaseNet(diagram: Diagram, net: Net): void {
    if (net.networkAddress != null && net.networkAddress != undefined) {
        diagram.ipv4Database.delete(AddressingHelper.getBroadcastAddress(net.networkAddress.address, net.bitmask));
        diagram.ipv4Database.delete(net.networkAddress.address);
    }
    //free the port of the gateways
    net.gateways.forEach((port, gatewayId) => {
        const gateway = diagram.node<Router>(gatewayId);
        if (!gateway) return;
        if (port != null && port != undefined && !Number.isNaN(port)) {
            gateway.portNetMapping.set(port, null!);
            gateway.portLinkMapping.set(port, '');
        }

        gateway.nets = gateway.nets.filter((other) => other.id != net.id);
        if (gateway.nets.length == 0) gateway.setClass('gateway-node', false); //if the gateway has no networks --> back to router-node
    });
}

/** The interfaces a new node of a kind starts with, as the toolbox adds it. */
export function newNodeData(diagram: Diagram, kind: string): PhysicalNodeData | NetNodeData {
    const mac = () => MacAddress.generateRandomAddress(diagram.macDatabase).address;
    switch (kind) {
        case 'net':
            return { componentType: 'net', net: { netid: '1.1.1.0', netmask: '255.255.255.0', bitmask: 24 } };
        case 'computer':
        case 'mobile':
            return {
                componentType: kind,
                interfaces: [
                    {
                        name: 'eth0',
                        connectionType: kind === 'computer' ? 'ethernet' : 'wireless',
                        mac: mac(),
                        ipv4: '192.168.20.1',
                        ipv6: '0:0:0:0:0:0:0:1',
                    },
                ],
            };
        case 'access-point':
        case 'switch':
            return { componentType: kind, interfaces: [{ mac: mac() }, { mac: mac() }] };
        case 'repeater':
            return { componentType: kind, interfaces: [{ connectionType: 'ethernet' }, { connectionType: 'ethernet' }] };
        case 'bridge':
            return {
                componentType: kind,
                interfaces: [
                    { connectionType: 'ethernet', mac: mac() },
                    { connectionType: 'ethernet', mac: mac() },
                ],
            };
        default:
            return { componentType: kind, interfaces: [] };
    }
}
