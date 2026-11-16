import type { Diagram } from './diagram';
import { AddressingHelper } from './addressing/addressing-helper';
import { Ipv4Address } from './addressing/ipv4-address';
import type { GraphNode } from './graph-node';
import { Net } from './logical-nodes/net';
import type { Router } from './physical-nodes/connector';
import type { PhysicalNode } from './physical-nodes/physical-node';
import { netBoxOf } from './layout';

function isRoutable(node: GraphNode): node is PhysicalNode {
    return node.has('physical-node') && (node as PhysicalNode).layer > 2;
}

function noGatewayYet(node: PhysicalNode, net: Net): void {
    if (net.currentDefaultGateway != undefined && net.currentDefaultGateway != null) {
        node.defaultGateway = net.currentDefaultGateway;
        node.setClass('default-gateway-not-found', false);
        node.setClass('gateway-changeable', true);
    } else {
        node.setClass('default-gateway-not-found', true);
    }
}

/**
 * Adjusts the addresses of a node that was put into a net (its `parent` is set already),
 * as the subnetting mode of the diagram asks.
 */
export function dropIntoNet(diagram: Diagram, node: GraphNode, net: Net): void {
    const database = diagram.ipv4Database;

    //reset the IP address of a host based on the network ID
    if (diagram.subnettingMode == 'NET_BASED') {
        if (isRoutable(node)) {
            node.portData.forEach((data: any) => {
                let ip4 = data.get('IPv4');
                if (ip4 != null && !ip4.matchesNetworkCidr(net)) {
                    Ipv4Address.removeAddressFromDatabase(ip4, database);
                    let newIpv4 = Ipv4Address.generateNewIpGivenNet(database, ip4, net)!;
                    data.set('IPv4', newIpv4);
                    Ipv4Address.addAddressToDatabase(newIpv4, database, node.id);
                }
            });
            noGatewayYet(node, net);
        } else if (node.has('net-node')) {
            const subnet = node as Net;
            //if the net doesn't match supernet's CIDR
            if (!net.isSupernetOf(subnet)) {
                database.delete(subnet.networkAddress.address); //delete the net from database
                database.delete(AddressingHelper.getBroadcastAddress(subnet.networkAddress.address, subnet.bitmask));
                subnet.networkAddress = null!; //delete the net Address
                subnet.setClass('unconfigured-net', true);
                subnet.name = '';
            }
        }
    } //reset the Network ID based on new element
    else if (diagram.subnettingMode == 'HOST_BASED') {
        if (isRoutable(node)) {
            node.portData.forEach((data: any) => {
                let ip4 = data.get('IPv4');
                if (ip4 != null && ip4 != undefined) Net.calculateCIDRGivenNewHost(net, ip4, database, diagram);
            });
            noGatewayYet(node, net);
        } else if (node.has('net-node')) {
            Net.calculateCIDRGivenNewSubnet(net, node as Net, database, diagram);
        }
    } else if (isRoutable(node) && !node.defaultGateway) {
        node.setClass('default-gateway-not-found', true);
    }
}

/** Checks every net on its own and against the other nets. Tells the user what is wrong unless `noAlert`. */
export function validateAllNets(diagram: Diagram, noAlert: boolean): boolean {
    const nets = diagram.nets();
    let allCorrect = true;
    const lines: string[] = [];
    let unconfig = false;

    nets.forEach((net) => {
        if (net.has('unconfigured-net')) {
            unconfig = true;
            return;
        }
        const children = diagram.childrenOf(net.id);
        const gateways: Router[] = [];
        net.gateways.forEach((_port, id) => {
            const gateway = diagram.node<Router>(id);
            if (gateway) gateways.push(gateway);
        });
        //check if each net is correctly assigned locally
        if (!net.validateNetLocally(children, gateways, diagram, noAlert)) allCorrect = false;

        nets.forEach((other) => {
            const isSupernet = net.isSupernetOf(other);
            const contains = children.includes(other);
            if (isSupernet && !contains) {
                lines.push('• ' + net.name + ' should contain subnet ' + other.name);
                allCorrect = false;
            } else if (!isSupernet && contains) {
                lines.push('• ' + net.name + ' is not a supernet of ' + other.name);
                allCorrect = false;
            }
        });
    });

    if (allCorrect && !unconfig) {
        if (noAlert) return true;
        diagram.notify('success', diagram.msg('Well done!'), diagram.msg('All nets are correctly configured!'));
        return true;
    } else if (unconfig) {
        if (noAlert) return false;
        lines.push('• ' + diagram.msg('Unconfigured net still exists.'));
    }
    if (noAlert) return false;
    if (lines.length) diagram.notify('warning', diagram.msg('Cross validation between Nets: '), lines.join('\n'));
    return allCorrect;
}

/** Records, for a gateway whose port faces a host inside a net, that the net is reached through that port. */
export function setUpGateway(diagram: Diagram, gatewayId: string, hostId: string, gatewayPort: number): void {
    const gateway = diagram.node<Router>(gatewayId);
    const host = diagram.node(hostId);
    if (!gateway || !host || !host.parent || !gateway.has('gateway-node')) return;
    const net = diagram.node<Net>(host.parent);
    if (!net) return;
    if (!net.gateways.has(gateway.id)) return;
    net.gateways.set(gateway.id, gatewayPort);
    gateway.portNetMapping.set(gatewayPort, net);
    const ip4 = gateway.portData.get(gatewayPort)?.get('IPv4');

    if (!net.currentDefaultGateway) net.currentDefaultGateway = [gateway.id, gatewayPort];

    switch (diagram.subnettingMode) {
        case 'HOST_BASED':
            if (ip4 != null && ip4 != undefined) Net.calculateCIDRGivenNewHost(net, ip4, diagram.ipv4Database, diagram);
            break;
        case 'NET_BASED':
            if (net.has('unconfigured-net')) {
                gateway.portData.get(gatewayPort)!.set('IPv4', Ipv4Address.getLoopBackAddress());
                diagram.notify(
                    'warning',
                    diagram.msg('Net-based mode on:'),
                    diagram.msg('Unconfigured net, automatically set Ipv4 address to loop-back.')
                );
            } else if (ip4 != null && !ip4.matchesNetworkCidr(net)) {
                Ipv4Address.removeAddressFromDatabase(ip4, diagram.ipv4Database);
                let newIp4 = Ipv4Address.generateNewIpGivenNet(diagram.ipv4Database, ip4, net)!;
                gateway.portData.get(gatewayPort)!.set('IPv4', newIp4);
                Ipv4Address.addAddressToDatabase(newIp4, diagram.ipv4Database, gateway.id);
            }
            break;
        default:
            break;
    }
}

/** A router dropped on the border of a net becomes a gateway of that net. */
export function addGateway(diagram: Diagram, routerId: string, x: number, y: number): void {
    const router = diagram.node<Router>(routerId);
    if (!router || !router.has('router-node')) return;
    diagram.nets().forEach((net) => {
        const box = netBoxOf(diagram, net);
        if (!box) return;
        const x1 = box.x;
        const x2 = box.x + box.width;
        const y1 = box.y;
        const y2 = box.y + box.height;
        //drag router onto the edge of a net
        if (
            (((x > x1 - 15 && x < x1 + 15) || (x > x2 - 15 && x < x2 + 15)) && y > y1 && y < y2) ||
            (((y > y1 - 15 && y < y1 + 15) || (y > y2 - 15 && y < y2 + 15)) && x > x1 && x < x2)
        ) {
            if (net.gateways.has(router.id)) return;
            router.nets = router.nets || [];
            router.nets.push(net);
            router.setClass('gateway-node', true);
            net.gateways.set(router.id, null!); // add gateway to the net, with undefined port
        }
    });
}
