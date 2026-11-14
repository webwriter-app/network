import { NodeSingular, EventObject } from 'cytoscape';
import { NetworkComponent } from '..';
import { Ipv4Address } from '../adressing/Ipv4Address';
import { GraphNode } from '../components/GraphNode';
import { Net } from '../components/logicalNodes/Net';
import { Router } from '../components/physicalNodes/Connector';
import { PhysicalNode } from '../components/physicalNodes/PhysicalNode';
import { AlertHelper } from '../utils/AlertHelper';
import { AddressingHelper } from '../utils/AdressingHelper';

export class SubnettingController {
    assignGatewayOn = false;
    mutexDragAndDrop!: string | null;

    private component: NetworkComponent;

    constructor(component: NetworkComponent) {
        this.component = component;
    }

    toggleDragAndDropSubnetting(event: Event, network: NetworkComponent) {
        if (this.mutexDragAndDrop == 'gateway') return;
        const target = event.target as HTMLInputElement;
        //if subnetting option is not active
        if (!target.checked) {
            target.checked = true;
            this.mutexDragAndDrop = 'subnetting';
            network.mutexDragAndDrop = 'subnetting';
            network._cdnd.enable();
        } else {
            target.checked = false;
            network._cdnd.disable();
            this.mutexDragAndDrop = null;
            network.mutexDragAndDrop = null;
        }
    }

    toggleAssigningGateway(event: Event, network: NetworkComponent) {
        if (this.mutexDragAndDrop == 'subnetting') return;
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            target.checked = true;
            this.mutexDragAndDrop = 'gateway';
            network.mutexDragAndDrop = 'gateway';
        } else {
            target.checked = false;
            this.mutexDragAndDrop = null;
            network.mutexDragAndDrop = null;
        }
        this.assignGatewayOn = target.checked;
    }

    addGateway(event: EventObject, network: NetworkComponent): void {
        var router = event.target;
        if (!(router.data() instanceof Router)) return;
        var mouse = event.position;
        network._graph.$('.net-node').forEach((net: any) => {
            var pos = net.boundingBox();
            //drag router onto the edge of a net
            if (
                (((mouse.x > pos.x1 - 15 && mouse.x < pos.x1 + 15) ||
                    (mouse.x > pos.x2 - 15 && mouse.x < pos.x2 + 15)) &&
                    mouse.y > pos.y1 &&
                    mouse.y < pos.y2) ||
                (((mouse.y > pos.y1 - 15 && mouse.y < pos.y1 + 15) ||
                    (mouse.y > pos.y2 - 15 && mouse.y < pos.y2 + 15)) &&
                    mouse.x > pos.x1 &&
                    mouse.x < pos.x2)
            ) {
                const nets = router.data('nets');
                nets.push(net.data());
                router.data('nets', nets); //add net to router node
                router.data('cssClass').push('gateway-node');
                router.toggleClass('gateway-node', true);
                let gatewayList = net.data('gateways');
                if (!gatewayList.has(router.id)) {
                    gatewayList.set(router.id(), null); // add gateway to the net, with undefined port
                }
                net.data('gateways', gatewayList);
            }
        });
    }

    onDragInACompound(grabbedNode: any, compound: any, database: Map<string, string>): void {
        let net: Net = compound.data();
        let node: PhysicalNode = grabbedNode.data();

        //reset the IP address of a host based on the network ID
        if (this.component.subnettingMode == 'NET_BASED') {
            if (node instanceof PhysicalNode && node.layer > 2) {
                node.portData.forEach((data: any) => {
                    let ip4 = data.get('IPv4');
                    if (ip4 != null && !ip4.matchesNetworkCidr(net)) {
                        Ipv4Address.removeAddressFromDatabase(ip4, database);
                        let newIpv4 = Ipv4Address.generateNewIpGivenNet(database, ip4, net)!;
                        data.set('IPv4', newIpv4);
                        Ipv4Address.addAddressToDatabase(newIpv4, database, node.id);
                    }
                });
                if (net.currentDefaultGateway != undefined && net.currentDefaultGateway != null) {
                    node.defaultGateway = net.currentDefaultGateway;
                    grabbedNode.addClass('gateway-changeable');
                    if (!grabbedNode.data('cssClass').includes('gateway-changeable'))
                        grabbedNode.data('cssClass').push('gateway-changeable');
                } else {
                    grabbedNode.addClass('default-gateway-not-found');
                    if (!grabbedNode.data('cssClass').includes('default-gateway-not-found'))
                        grabbedNode.data('cssClass').push('default-gateway-not-found');
                }
            } else if (node instanceof Net) {
                //if the net doesn't match supernet's CIDR
                if (!net.isSupernetOf(node)) {
                    database.delete(node.networkAddress.address); //delete the net from database
                    database.delete(AddressingHelper.getBroadcastAddress(node.networkAddress.address, node.bitmask));
                    node.networkAddress = null!; //delete the net Address
                    grabbedNode.addClass('unconfigured-net'); //seems redundant? no direct mapping between cssClass and classes of cytopscape?
                    node.cssClass.push('unconfigured-net');
                    node.name = '';
                }
            }
        } //reset the Network ID based on new element
        else if (this.component.subnettingMode == 'HOST_BASED') {
            if (node instanceof PhysicalNode && node.layer > 2) {
                node.portData.forEach((data: any) => {
                    let ip4 = data.get('IPv4');
                    if (ip4 != null && ip4 != undefined)
                        Net.calculateCIDRGivenNewHost(net, ip4, database, this.component);
                    compound.classes(net.cssClass);
                });
                if (net.currentDefaultGateway != undefined && net.currentDefaultGateway != null) {
                    node.defaultGateway = net.currentDefaultGateway;
                    grabbedNode.addClass('gateway-changeable');
                    if (!grabbedNode.data('cssClass').includes('gateway-changeable'))
                        grabbedNode.data('cssClass').push('gateway-changeable');
                } else {
                    grabbedNode.addClass('default-gateway-not-found');
                    if (!grabbedNode.data('cssClass').includes('default-gateway-not-found'))
                        grabbedNode.data('cssClass').push('default-gateway-not-found');
                }
            } else if (node instanceof Net) {
                Net.calculateCIDRGivenNewSubnet(net, node, database, this.component);
                compound.classes(net.cssClass);
            }
        } else {
            if (node instanceof PhysicalNode && node.layer > 2) {
                grabbedNode.addClass('default-gateway-not-found');
                if (!grabbedNode.data('cssClass').includes('default-gateway-not-found'))
                    grabbedNode.data('cssClass').push('default-gateway-not-found');
            }
        }
    }

    //TODO: automatically run this before the packet simulation
    validateAllNets(noAlert: boolean, network: NetworkComponent): boolean {
        let nets = network._graph.$('.net-node');
        let allCorrect = true;
        let alert = '';
        let unconfig = false;

        nets.forEach((networkNode: any) => {
            if (networkNode.hasClass('unconfigured-net')) {
                unconfig = true;
            } else {
                let nw: Net = networkNode.data() as Net;
                let hosts: GraphNode[] = [];
                let gateways: Router[] = [];
                //check if each net is correctly assigned locally
                networkNode.children().forEach((node: any) => hosts.push(node.data()));
                nw.gateways.forEach((_port, id) => gateways.push(network._graph.$('#' + id).data() as Router));
                if (!nw.validateNetLocally(hosts, gateways, network, noAlert)) allCorrect = false;

                nets.forEach((net: any) => {
                    let isSupernet: boolean = (nw as Net).isSupernetOf(net.data());
                    let contains: boolean = networkNode.children().contains(net);
                    if (isSupernet && !contains) {
                        alert += '<li>' + nw.name + ' should contain subnet ' + net.data().name + '</li>';
                        allCorrect = false;
                    } else if (!isSupernet && contains) {
                        alert += '<li>' + nw.name + ' is not a supernet of ' + net.data().name + '</li>';
                        allCorrect = false;
                    }
                });
            }
        });

        if (allCorrect && !unconfig) {
            if (noAlert) return true;
            AlertHelper.toastAlert('success', 'check2-circle', network.msg('Well done!'), network.msg('All nets are correctly configured!'));
            return true;
        } else if (unconfig) {
            if (noAlert) return false;
            alert += `<li>${network.msg('Unconfigured net still exists.')}</li>`;
        }
        if (noAlert) return false;
        if (alert != '')
            AlertHelper.toastAlert('warning', 'exclamation-triangle', network.msg('Cross validation between Nets: '), alert);
        return allCorrect;
    }

    setUpGateway(gateway: NodeSingular, host: NodeSingular, gatewayPort: number, database: Map<string, string>): void {
        if (host.isChild() && gateway.hasClass('gateway-node')) {
            console.log(
                this.component.msg('Setting up gateway: '),
                gateway.data(),
                host.data(),
                gatewayPort,
                host.isChild(),
                gateway.hasClass('gateway-node')
            );
            let net = host.parent();
            let gatewayNodeId = gateway.data().id;
            let gatewayList: Map<string, number> = net.data('gateways');
            if (!gatewayList.has(gatewayNodeId)) return;
            gatewayList.set(gatewayNodeId, gatewayPort);
            net.data('gateways', gatewayList);
            gateway.data('portNetMapping').set(gatewayPort, net.data());
            let ip4 = gateway.data('portData').get(gatewayPort).get('IPv4');

            if (!net.data('currentDefaultGateway')) net.data('currentDefaultGateway', [gatewayNodeId, gatewayPort]);

            switch (this.component.subnettingMode) {
                case 'HOST_BASED':
                    if (ip4 != null && ip4 != undefined)
                        Net.calculateCIDRGivenNewHost(net.data() as Net, ip4, database, this.component);
                    net.classes(net.data('cssClass'));
                    break;
                case 'NET_BASED':
                    if ((net as unknown as NodeSingular).hasClass('unconfigured-net')) {
                        gateway.data('portData').get(gatewayPort).set('IPv4', Ipv4Address.getLoopBackAddress());
                        AlertHelper.toastAlert(
                            'warning',
                            'exclamation-triangle',
                            this.component.msg('Net-based mode on:'),
                            this.component.msg('Unconfigured net, automatically set Ipv4 address to loop-back.')
                        );
                    } else if (ip4 != null && !ip4.matchesNetworkCidr(net.data() as Net)) {
                        Ipv4Address.removeAddressFromDatabase(ip4, database);
                        let newIp4 = Ipv4Address.generateNewIpGivenNet(database, ip4, net.data() as Net)!;
                        gateway.data('portData').get(gatewayPort).set('IPv4', newIp4);
                        Ipv4Address.addAddressToDatabase(newIp4, database, gateway.id());
                    }
                    break;
                default:
                    break;
            }
        }
    }
}
