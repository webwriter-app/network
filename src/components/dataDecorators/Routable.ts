import { NetworkComponent } from '../..';
import { AddressingHelper } from '../../utils/AdressingHelper';
import { AlertHelper } from '../../utils/AlertHelper';
import { AnimationHelper } from '../../utils/AnimationHelper';
import { RoutingData } from '../../utils/routingData';
import { TableHelper } from '../../utils/TableHelper';
import { GraphEdge } from '../GraphEdge';
import { Data, Packet, Frame } from '../logicalNodes/DataNode';
import { Net } from '../logicalNodes/Net';
import { Router } from '../physicalNodes/Connector';
import { PhysicalNode } from '../physicalNodes/PhysicalNode';
import { DataHandlingDecorator } from './DataHandlingDecorator';

export class RoutableDecorator extends DataHandlingDecorator {
    arpTableMacIp: Map<string, string> = new Map(); //(mac, ip)
    arpTableIpMac: Map<string, string> = new Map();
    routingTable: Map<string, RoutingData> = new Map(); // (destination-address, routingAttributes)

    pendingPackets: Map<string, string[]> = new Map<string, string[]>(); //ip of receiver / list of ids of pending packets

    pathsToOtherRouters?: Map<string, string[]> = new Map<string, any>(); //(ip of other router, path from this router to other router)
    nets?: Net[];
    portNetMapping?: Map<number, Net> = new Map();

    constructor(component: PhysicalNode, network: NetworkComponent) {
        super(component);
        this.cssClass.push('routable-decorated');
        if (component instanceof Router) {
            this.nets = component.nets;
            this.portNetMapping = component.portNetMapping;
        }
        TableHelper.initTable(this.id, 'ArpTable', network);
        TableHelper.initTable(this.id, 'RoutingTable', network);
    }

    handleDataIn(dataNode: any, previousNode: any, network: NetworkComponent): void {
        let data = dataNode.data();
        let receiverMac: string = data.layer2header.macReceiver;
        let receiverIp: string = data instanceof Packet ? data.layer3header.ipReceiver : data.layer2header.ipReceiver;

        let portIn: number = this.getPortIn(previousNode.data('id'), network)!;
        let thisMac: string = this.portData.get(portIn)!.get('MAC').address;
        let thisIp: string = this.portData.get(portIn)!.get('IPv4').address;

        if (receiverMac != '' && receiverMac != 'FF:FF:FF:FF:FF:FF' && receiverMac != thisMac) {
            if (data instanceof Frame)
                AnimationHelper.blinkingThenRemoveNode('discard-data-node-2part', dataNode.id(), network);
            if (data instanceof Packet)
                AnimationHelper.blinkingThenRemoveNode('discard-data-node-3part', dataNode.id(), network);
            return;
        }

        if (data instanceof Data) {
            if (data instanceof Frame && data.name.includes('ARP res')) {
                console.log('arp res', this);
                this.populateRoutingTableOnNewData(previousNode.id(), dataNode, network);
                this.populateArpTable(data.layer2header.ipSender, data.layer2header.macSender, network);
            } else if (data instanceof Frame && data.name.includes('ARP req')) {
                if (thisIp != receiverIp) {
                    AnimationHelper.blinkingThenRemoveNode('discard-data-node-2part', dataNode.id(), network);
                    return;
                } else {
                    console.log('arp req', this);
                    this.populateRoutingTableOnNewData(previousNode.id(), dataNode, network);
                    this.receiveArpRequest(
                        portIn,
                        data.layer2header.macSender,
                        data.layer2header.ipSender,
                        data.layer2header.ipReceiver,
                        network
                    );
                }
            } else if (data instanceof Packet) {
                if (receiverIp == thisIp) {
                    this.populateRoutingTableOnNewData(previousNode.id(), dataNode, network);
                    if (this.checkIfSameNetwork(thisIp, data.layer3header.ipSender, network)) {
                        this.populateArpTable(data.layer3header.ipSender, data.layer2header.macSender, network);
                    }

                    AnimationHelper.blinkingThenRemoveNode('processing-data-node-3part', dataNode.id(), network);
                    AlertHelper.toastAlert('success', 'check2-all', '', network.msg('Your receiver has received the message!'));
                } else if (this.cssClass.includes('router-node')) {
                    this.removeLayer2Header(data, network);
                    let portToSend = this.findPortToSend(data.layer3header.ipReceiver);

                    if (portToSend != null) {
                        let ipReceiver = data.layer3header.ipReceiver;
                        let macSender = this.portData.get(portToSend)!.get('MAC').address;
                        if (this.arpTableIpMac.has(ipReceiver)) {
                            if (data instanceof Packet) {
                                let macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                                this.addLayer2Header(data, macSender, macReceiver, network);
                                network.packetSimulator.findNextHopThenSend(
                                    portIn,
                                    network._graph.$('#' + this.id),
                                    dataNode,
                                    network
                                );
                            }
                        } else {
                            let nextGateway = this.getNextGateway(data.layer3header.ipReceiver);
                            if (nextGateway != null) {
                                console.log(nextGateway);
                                // PacketSimulator.directSend(
                                //     network._graph.$('#' + this.id),
                                //     network._graph.$('#' + network.ipv4Database.get(nextGateway)),
                                //     dataNode,
                                //     network
                                // );
                                this.sendDataToAnotherNetwork(
                                    portIn,
                                    dataNode,
                                    macSender,
                                    this.portData.get(portToSend)!.get('IPv4').address,
                                    '',
                                    data.layer3header.ipReceiver,
                                    nextGateway,
                                    network
                                );
                            } else {
                                data.layer2header.macSender = this.portData.get(portToSend)!.get('MAC').address;
                                this.sendDataInSameNetwork(
                                    portIn,
                                    dataNode,
                                    macSender,
                                    data.layer3header.ipSender,
                                    '',
                                    ipReceiver,
                                    network
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    sendData(dataNode: any, network: NetworkComponent, senderNode?: any): void {
        let data: Packet = dataNode.data();
        let receiverIp = data.layer3header.ipReceiver;
        let net: Net = senderNode.parent().data() as Net;

        //check if in same network
        if (
            net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
            AddressingHelper.decimalStringWithDotToBinary(receiverIp).slice(0, net.bitmask)
        ) {
            this.sendDataInSameNetwork(
                null,
                dataNode,
                this.getMacProvidedIp(data.layer3header.ipSender)!,
                data.layer3header.ipSender,
                '',
                data.layer3header.ipReceiver,
                network
            );
        } else {
            console.log('sending to another network', dataNode.id(), this.defaultGateway);
            this.sendDataToAnotherNetwork(
                null,
                dataNode,
                this.getMacProvidedIp(data.layer3header.ipSender)!,
                data.layer3header.ipSender,
                '',
                data.layer3header.ipReceiver,
                network._graph
                    .$('#' + this.defaultGateway![0])
                    .data()
                    .portData.get(+this.defaultGateway![1])
                    .get('IPv4').address,
                network
            );
        }
    }

    sendArpRequest(
        portIn: number | null,
        macSender: string,
        ipSender: string,
        ipReceiver: string,
        network: NetworkComponent
    ): void {
        let arpRequest: Frame = Frame.createArpRequest(network.currentColor, macSender, ipSender, ipReceiver);
        console.log('sending arp request', arpRequest, ipSender, network.ipv4Database.get(ipSender));
        network.packetSimulator.initMessage(
            network._graph.$('#' + network.ipv4Database.get(ipSender)),
            arpRequest,
            network
        );
        let arpNode = network._graph.$('#' + arpRequest.id);
        this.sendDataInSameNetwork(
            portIn,
            arpNode,
            macSender,
            ipSender,
            arpRequest.layer2header.macReceiver,
            ipReceiver,
            network
        );
    }

    receiveArpRequest(
        portIn: number,
        macSender: string,
        ipSender: string,
        ipReceiver: string,
        network: NetworkComponent
    ): void {
        let macReceiver: string = this.portData.get(portIn!)!.get('MAC').address;
        this.populateArpTable(ipSender, macSender, network);

        let arpRes: Frame = Frame.createArpResponse(network.currentColor, macReceiver, macSender, ipReceiver, ipSender);
        network.packetSimulator.initMessage(network._graph.$('#' + this.id), arpRes, network);
        let arpNode = network._graph.$('#' + arpRes.id);
        this.sendDataInSameNetwork(portIn, arpNode, macReceiver, ipReceiver, macSender, ipSender, network);
    }

    sendDataInSameNetwork(
        lastPortIn: number | null,
        dataNode: any,
        macSender: string,
        ipSender: string,
        macReceiver: string,
        ipReceiver: string,
        network: NetworkComponent
    ): void {
        let thisNode = network._graph.$('#' + this.id);
        let data = dataNode.data();
        console.log(
            'sending data in same network',
            dataNode.id(),
            this.id,
            macSender,
            ipSender,
            macReceiver,
            ipReceiver,
            thisNode.data()
        );

        if (
            !(thisNode.data() as RoutableDecorator).checkIfSameNetwork(
                this.getIpProvidedMac(macSender)!,
                ipReceiver,
                network
            )
        ) {
            console.log('not in same network');
            return;
        }

        if (macReceiver == 'FF:FF:FF:FF:FF:FF') {
            this.flood(dataNode, null, lastPortIn, network);
        } else if (this.arpTableMacIp.has(macReceiver) || this.arpTableIpMac.has(ipReceiver)) {
            if (data instanceof Frame) {
                network.packetSimulator.findNextHopThenSend(lastPortIn, thisNode, dataNode, network);
            } else if (data instanceof Packet) {
                let macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                let port = this.findPortToSend(ipReceiver);
                let macSender: string = this.portData.get(port!)!.get('MAC').address;

                this.addLayer2Header(data, macSender, macReceiver, network);
                network.packetSimulator.findNextHopThenSend(lastPortIn, thisNode, dataNode, network);
            }
        } else if (this.routingTable.has(ipReceiver) && data.name.includes('ARP res')) {
            if (data instanceof Frame) {
                network.packetSimulator.findNextHopThenSend(lastPortIn, thisNode, dataNode, network);
            } else if (data instanceof Packet) {
                let macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                let port = this.findPortToSend(ipReceiver);
                let macSender: string = this.portData.get(port!)!.get('MAC').address;

                this.addLayer2Header(data, macSender, macReceiver, network);
                network.packetSimulator.findNextHopThenSend(lastPortIn, thisNode, dataNode, network);
            }
        } else {
            this.sendArpRequest(lastPortIn, macSender, this.getIpProvidedMac(macSender)!, ipReceiver, network);
            if (!this.pendingPackets.has(ipReceiver)) this.pendingPackets.set(ipReceiver, []);
            this.pendingPackets.get(ipReceiver)!.push(dataNode.id());
        }
    }

    sendDataToAnotherNetwork(
        lastPortIn: number | null,
        dataNode: any,
        macSender: string,
        ipSender: string,
        _macReceiver: string,
        ipReceiver: string,
        gatewayIp: string,
        network: NetworkComponent
    ): void {
        let senderNode = network._graph.$('#' + network.ipv4Database.get(ipSender));

        if ((senderNode.data() as RoutableDecorator).checkIfSameNetwork(ipSender, ipReceiver, network)) return;

        if (this.arpTableIpMac.has(gatewayIp)) {
            this.sendDataInSameNetwork(
                lastPortIn,
                dataNode,
                macSender,
                ipSender,
                this.arpTableMacIp.get(gatewayIp)!,
                gatewayIp,
                network
            );
        } else {
            this.sendArpRequest(lastPortIn, macSender, ipSender, gatewayIp, network);
            if (!this.pendingPackets.has(gatewayIp)) this.pendingPackets.set(gatewayIp, []);
            this.pendingPackets.get(gatewayIp)!.push(dataNode.id());
        }
    }

    addLayer2Header(data: Packet, macSender: string, macReceiver: string, network: NetworkComponent): void {
        data.layer2header.macSender = macSender;
        data.layer2header.macReceiver = macReceiver;
        data.name = 'L2 L3 DATA';
        network._graph.$('#' + data.id).toggleClass('data-node-layer2-layer3', true);
        network._graph.$('#' + data.id).toggleClass('data-node-layer3', false);
    }
    removeLayer2Header(data: Packet, network: NetworkComponent): void {
        data.layer2header.macSender = '';
        data.layer2header.macReceiver = '';
        this.name = 'L3    DATA';
        network._graph.$('#' + data.id).toggleClass('data-node-layer2-layer3', false);
        network._graph.$('#' + data.id).toggleClass('data-node-layer3', true);
    }

    populateArpTable(ip: string, mac: string, network: NetworkComponent): void {
        this.arpTableMacIp.set(mac, ip);
        this.arpTableIpMac.set(ip, mac);
        //TableHelper.addRow('arp-table-' + this.id, "ArpTable", network, [ip, mac]);
        TableHelper.reloadTable('arp-table-' + this.id, 'ArpTable', this.arpTableIpMac, network);

        //send out pending Packets after getting ARP table populated
        if (this.pendingPackets.has(ip)) {
            this.pendingPackets.get(ip)!.forEach((dataId) => {
                let dataNode = network._graph.$('#' + dataId);
                let data: Packet = dataNode.data() as Packet;
                let source: PhysicalNode = network._graph
                    .$('#' + network.ipv4Database.get(data.layer3header.ipSender))
                    .data();
                let portToSend: number | null = null;
                source.portData.forEach((value, port) => {
                    if (value.get('IPv4').address == data.layer3header.ipSender) {
                        portToSend = port;
                    }
                });
                this.sendDataInSameNetwork(
                    portToSend,
                    dataNode,
                    data.layer2header.macSender,
                    data.layer3header.ipSender,
                    mac,
                    ip,
                    network
                );
            });
            this.pendingPackets.set(ip, []);
        }
    }

    populateRoutingTableOnNewData(previousId: string, dataNode: any, network: NetworkComponent): void {
        let data = dataNode.data();
        let portIn = this.getPortIn(previousId, network);

        if (this.cssClass.includes('router-node')) {
            if (data instanceof Frame && data.name.includes('ARP res')) {
                AnimationHelper.blinkingThenRemoveNode('discard-data-node-2part', dataNode.id(), network);
            } else if (data instanceof Frame && data.name.includes('ARP req')) {
                AnimationHelper.blinkingThenRemoveNode('processing-data-node-2part', dataNode.id(), network);
            } else {
                AnimationHelper.blinkingThenRemoveNode('discard-data-node-3part', dataNode.id(), network);
            }
            return;
        }

        console.log('populate routing table', previousId, dataNode, data.constructor.name);
        if (data instanceof Frame) {
            let destination: string = dataNode.data().layer2header.ipSender;
            if (this.checkIfSameNetwork(this.portData.get(portIn!)!.get('IPv4').address, destination, network)) {
                let routingData = new RoutingData(
                    destination,
                    'on-link',
                    32,
                    this.portData.get(portIn!)!.get('Name'),
                    portIn!
                );
                this.routingTable.set(destination, routingData);
                // TableHelper.addRow('routing-table-' + this.id, "RoutingTable", network, [routingData.destination, routingData.gateway, routingData.bitmask,
                // routingData.port]);
                TableHelper.reloadTable('routing-table-' + this.id, 'RoutingTable', this.routingTable, network);
            }
            AnimationHelper.blinkingThenRemoveNode('processing-data-node-2part', dataNode.id(), network);
        } else if (data instanceof Packet) {
            let senderIp = data.layer3header.ipSender;
            let gatewayIp = this.arpTableMacIp.get(data.layer2header.macSender);
            let routingData: RoutingData;
            if (this.checkIfSameNetwork(data.layer3header.ipReceiver, senderIp, network)) {
                routingData = new RoutingData(senderIp, 'on-link', 32, this.portData.get(portIn!)!.get('Name'), portIn!);
            } else {
                routingData = new RoutingData(senderIp, gatewayIp!, 32, this.portData.get(portIn!)!.get('Name'), portIn!);
            }

            this.routingTable.set(senderIp, routingData);
            // TableHelper.addRow('routing-table-' + this.id, "RoutingTable", network, [routingData.destination, routingData.gateway, routingData.bitmask,
            // routingData.port]);
            TableHelper.reloadTable('routing-table-' + this.id, 'RoutingTable', this.routingTable, network);
            AnimationHelper.blinkingThenRemoveNode('processing-data-node-3part', dataNode.id(), network);
        }
    }

    //longest match
    findPortToSend(ip: string): number | undefined {
        console.log('finding port to send', ip, this);
        let longestPrefixMatch: number = 0;
        let port: number | undefined;

        this.routingTable.forEach((attributes, address) => {
            let numOfMatchedPrefix = AddressingHelper.getPrefix([
                AddressingHelper.decimalStringWithDotToBinary(address),
                AddressingHelper.decimalStringWithDotToBinary(ip),
            ]).length;
            if (
                numOfMatchedPrefix >= attributes.bitmask &&
                (attributes.bitmask > longestPrefixMatch || attributes.bitmask == longestPrefixMatch)
            ) {
                longestPrefixMatch = attributes.bitmask;
                port = attributes.port;
            }
        });
        console.log('found port', port);
        return port;
    }

    getNextGateway(ip: string): string | null {
        let nextHop: string | null = null;
        let longestPrefixMatch: number = 0;

        this.routingTable.forEach((attributes, address) => {
            let numOfMatchedPrefix = AddressingHelper.getPrefix([
                AddressingHelper.decimalStringWithDotToBinary(address),
                AddressingHelper.decimalStringWithDotToBinary(ip),
            ]).length;
            if (
                numOfMatchedPrefix >= attributes.bitmask &&
                (attributes.bitmask > longestPrefixMatch || attributes.bitmask == longestPrefixMatch)
            ) {
                if (attributes.gateway != 'on-link' && attributes.gateway != '') nextHop = attributes.gateway;
                longestPrefixMatch = attributes.bitmask;
            }
        });
        return nextHop;
    }

    getMacProvidedIp(ip: string): string | null {
        let mac: string | null = null;
        this.portData.forEach((value) => {
            if (value.get('IPv4').address == ip) mac = value.get('MAC').address;
        });
        return mac;
    }

    getIpProvidedMac(mac: string): string | null {
        let ip: string | null = null;
        this.portData.forEach((value) => {
            if (value.get('MAC').address == mac) ip = value.get('IPv4').address;
        });
        return ip;
    }

    checkIfSameNetwork(source: string, destination: string, network: NetworkComponent): boolean {
        let destId = network.ipv4Database.get(destination);
        let thisNode = network._graph.$('#' + this.id);
        let destNode = network._graph.$('#' + destId);
        let net: Net;
        console.log('checking if same network', source, destination, thisNode.data(), destNode.data());

        if (!thisNode.isOrphan()) {
            net = network._graph
                .$('#' + this.id)
                .parent()
                .data() as Net;
            if (
                net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
                AddressingHelper.decimalStringWithDotToBinary(destination).slice(0, net.bitmask)
            ) {
                return true;
            } else {
                return false;
            }
        } else if (!destNode.isOrphan()) {
            net = network._graph
                .$('#' + destId)
                .parent()
                .data() as Net;
            if (
                net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
                AddressingHelper.decimalStringWithDotToBinary(source).slice(0, net.bitmask)
            ) {
                return true;
            } else {
                return false;
            }
        } else if (
            thisNode.data().cssClass.includes('router-node') &&
            destNode.data().cssClass.includes('router-node')
        ) {
            return true;
        } else {
            return false;
        }
    }

    flood(dataNode: any, previousId: string | null, port: number | null, network: NetworkComponent): void {
        dataNode = dataNode.remove();

        this.portLinkMapping.forEach((linkId, portIn) => {
            if (linkId != null && linkId != undefined && linkId != '') {
                let edge: GraphEdge = network._graph.$('#' + linkId).data();
                let directTargetId = edge.target == this.id ? edge.source : edge.target;
                let nextHop = network._graph.$('#' + directTargetId);
                let destination: string =
                    dataNode.data() instanceof Frame
                        ? dataNode.data('layer2header').ipReceiver
                        : dataNode.data('layer3header').ipReceiver;

                if (port == portIn || edge.target == previousId || edge.source == previousId) {
                    //do not flood the incoming port
                } else if (
                    !this.checkIfSameNetwork(this.portData.get(portIn!)!.get('IPv4').address, destination, network)
                ) {
                    //do not flood other network
                } else {
                    let newData =
                        dataNode.data() instanceof Packet
                            ? Packet.cloneData(dataNode.data())
                            : Frame.cloneData(dataNode.data());
                    network.packetSimulator.initThenDirectSend(
                        network._graph.$('#' + this.id),
                        nextHop,
                        newData,
                        network
                    );
                }
            }
        });
    }
}
