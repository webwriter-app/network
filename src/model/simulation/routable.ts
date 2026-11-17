import { AddressingHelper } from '../addressing/addressing-helper';
import { RoutingData } from '../routing-data';
import { Data, Packet, Frame } from '../logical-nodes/data-node';
import type { Net } from '../logical-nodes/net';
import { Router } from '../physical-nodes/connector';
import type { PhysicalNode } from '../physical-nodes/physical-node';
import type { Courier } from './courier';
import { DataHandlingDecorator } from './data-handling-decorator';

/** Hosts and routers: they resolve addresses (ARP), keep a routing table and forward packets. */
export class RoutableDecorator extends DataHandlingDecorator {
    arpTableMacIp: Map<string, string> = new Map(); //(mac, ip)
    arpTableIpMac: Map<string, string> = new Map();
    routingTable: Map<string, RoutingData> = new Map(); // (destination-address, routingAttributes)

    pendingPackets: Map<string, string[]> = new Map<string, string[]>(); //ip of receiver / list of ids of pending packets

    nets?: Net[];
    portNetMapping?: Map<number, Net> = new Map();

    constructor(component: PhysicalNode) {
        super(component);
        this.cssClass.push('routable-decorated');
        if (component instanceof Router) {
            this.nets = component.nets;
            this.portNetMapping = component.portNetMapping;
        }
    }

    override handleDataIn(data: Data, previousId: string, courier: Courier): void {
        const receiverMac: string = data.layer2header.macReceiver;
        const receiverIp: string = data instanceof Packet ? data.layer3header.ipReceiver : data.layer2header.ipReceiver;

        const portIn: number = this.getPortIn(previousId, courier.diagram)!;
        const thisMac: string = this.portData.get(portIn)!.get('MAC').address;
        const thisIp: string = this.portData.get(portIn)!.get('IPv4').address;

        if (receiverMac != '' && receiverMac != 'FF:FF:FF:FF:FF:FF' && receiverMac != thisMac) {
            if (data instanceof Frame) courier.blinkingThenRemove('discard-data-node-2part', data);
            if (data instanceof Packet) courier.blinkingThenRemove('discard-data-node-3part', data);
            return;
        }

        if (data instanceof Frame && data.name.includes('ARP res')) {
            this.populateRoutingTableOnNewData(previousId, data, courier);
            this.populateArpTable(data.layer2header.ipSender, data.layer2header.macSender, courier);
        } else if (data instanceof Frame && data.name.includes('ARP req')) {
            if (thisIp != receiverIp) {
                courier.blinkingThenRemove('discard-data-node-2part', data);
                return;
            } else {
                this.populateRoutingTableOnNewData(previousId, data, courier);
                this.receiveArpRequest(
                    portIn,
                    data.layer2header.macSender,
                    data.layer2header.ipSender,
                    data.layer2header.ipReceiver,
                    courier
                );
            }
        } else if (data instanceof Packet) {
            if (receiverIp == thisIp) {
                this.populateRoutingTableOnNewData(previousId, data, courier);
                if (this.checkIfSameNetwork(thisIp, data.layer3header.ipSender, courier)) {
                    this.populateArpTable(data.layer3header.ipSender, data.layer2header.macSender, courier);
                }

                courier.blinkingThenRemove('processing-data-node-3part', data);
                courier.diagram.notify('success', '', courier.diagram.msg('Your receiver has received the message!'));
            } else if (this.has('router-node')) {
                this.removeLayer2Header(data);
                const portToSend = this.findPortToSend(data.layer3header.ipReceiver);

                if (portToSend != null) {
                    const ipReceiver = data.layer3header.ipReceiver;
                    const macSender = this.portData.get(portToSend)!.get('MAC').address;
                    if (this.arpTableIpMac.has(ipReceiver)) {
                        const macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                        this.addLayer2Header(data, macSender, macReceiver);
                        courier.findNextHopThenSend(portIn, this.id, data);
                    } else {
                        const nextGateway = this.getNextGateway(data.layer3header.ipReceiver);
                        if (nextGateway != null) {
                            this.sendDataToAnotherNetwork(
                                portIn,
                                data,
                                macSender,
                                this.portData.get(portToSend)!.get('IPv4').address,
                                '',
                                data.layer3header.ipReceiver,
                                nextGateway,
                                courier
                            );
                        } else {
                            data.layer2header.macSender = this.portData.get(portToSend)!.get('MAC').address;
                            this.sendDataInSameNetwork(
                                portIn,
                                data,
                                macSender,
                                '',
                                ipReceiver,
                                courier
                            );
                        }
                    }
                }
            }
        }
    }

    override sendData(data: Packet, courier: Courier): void {
        const receiverIp = data.layer3header.ipReceiver;
        const net = courier.diagram.netOf(this.id)!;

        //check if in same network
        if (
            net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
            AddressingHelper.decimalStringWithDotToBinary(receiverIp).slice(0, net.bitmask)
        ) {
            this.sendDataInSameNetwork(
                null,
                data,
                this.getMacProvidedIp(data.layer3header.ipSender)!,
                '',
                data.layer3header.ipReceiver,
                courier
            );
        } else {
            this.sendDataToAnotherNetwork(
                null,
                data,
                this.getMacProvidedIp(data.layer3header.ipSender)!,
                data.layer3header.ipSender,
                '',
                data.layer3header.ipReceiver,
                courier.diagram
                    .node<PhysicalNode>(this.defaultGateway![0])!
                    .portData.get(+this.defaultGateway![1])!
                    .get('IPv4').address,
                courier
            );
        }
    }

    sendArpRequest(
        portIn: number | null,
        macSender: string,
        ipSender: string,
        ipReceiver: string,
        courier: Courier
    ): void {
        const arpRequest: Frame = Frame.createArpRequest(courier.diagram.currentColor, macSender, ipSender, ipReceiver);
        courier.initMessage(courier.diagram.ipv4Database.get(ipSender)!, arpRequest);
        this.sendDataInSameNetwork(
            portIn,
            arpRequest,
            macSender,
            arpRequest.layer2header.macReceiver,
            ipReceiver,
            courier
        );
    }

    receiveArpRequest(
        portIn: number,
        macSender: string,
        ipSender: string,
        ipReceiver: string,
        courier: Courier
    ): void {
        const macReceiver: string = this.portData.get(portIn!)!.get('MAC').address;
        this.populateArpTable(ipSender, macSender, courier);

        const arpRes: Frame = Frame.createArpResponse(courier.diagram.currentColor, macReceiver, macSender, ipReceiver, ipSender);
        courier.initMessage(this.id, arpRes);
        this.sendDataInSameNetwork(portIn, arpRes, macReceiver, macSender, ipSender, courier);
    }

    sendDataInSameNetwork(
        lastPortIn: number | null,
        data: Data,
        macSender: string,
        macReceiver: string,
        ipReceiver: string,
        courier: Courier
    ): void {
        if (!this.checkIfSameNetwork(this.getIpProvidedMac(macSender)!, ipReceiver, courier)) {
            return;
        }

        if (macReceiver == 'FF:FF:FF:FF:FF:FF') {
            this.flood(data, null, lastPortIn, courier);
        } else if (this.arpTableMacIp.has(macReceiver) || this.arpTableIpMac.has(ipReceiver)) {
            if (data instanceof Frame) {
                courier.findNextHopThenSend(lastPortIn, this.id, data);
            } else if (data instanceof Packet) {
                const macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                const port = this.findPortToSend(ipReceiver);
                const macSender: string = this.portData.get(port!)!.get('MAC').address;

                this.addLayer2Header(data, macSender, macReceiver);
                courier.findNextHopThenSend(lastPortIn, this.id, data);
            }
        } else if (this.routingTable.has(ipReceiver) && data.name.includes('ARP res')) {
            if (data instanceof Frame) {
                courier.findNextHopThenSend(lastPortIn, this.id, data);
            } else if (data instanceof Packet) {
                const macReceiver: string = this.arpTableIpMac.get(ipReceiver)!;
                const port = this.findPortToSend(ipReceiver);
                const macSender: string = this.portData.get(port!)!.get('MAC').address;

                this.addLayer2Header(data, macSender, macReceiver);
                courier.findNextHopThenSend(lastPortIn, this.id, data);
            }
        } else {
            this.sendArpRequest(lastPortIn, macSender, this.getIpProvidedMac(macSender)!, ipReceiver, courier);
            if (!this.pendingPackets.has(ipReceiver)) this.pendingPackets.set(ipReceiver, []);
            this.pendingPackets.get(ipReceiver)!.push(data.id);
        }
    }

    sendDataToAnotherNetwork(
        lastPortIn: number | null,
        data: Data,
        macSender: string,
        ipSender: string,
        _macReceiver: string,
        ipReceiver: string,
        gatewayIp: string,
        courier: Courier
    ): void {
        const senderNode = courier.diagram.node<RoutableDecorator>(courier.diagram.ipv4Database.get(ipSender));

        if (senderNode?.checkIfSameNetwork(ipSender, ipReceiver, courier)) return;

        if (this.arpTableIpMac.has(gatewayIp)) {
            this.sendDataInSameNetwork(
                lastPortIn,
                data,
                macSender,
                this.arpTableMacIp.get(gatewayIp)!,
                gatewayIp,
                courier
            );
        } else {
            this.sendArpRequest(lastPortIn, macSender, ipSender, gatewayIp, courier);
            if (!this.pendingPackets.has(gatewayIp)) this.pendingPackets.set(gatewayIp, []);
            this.pendingPackets.get(gatewayIp)!.push(data.id);
        }
    }

    addLayer2Header(data: Packet, macSender: string, macReceiver: string): void {
        data.layer2header.macSender = macSender;
        data.layer2header.macReceiver = macReceiver;
        data.name = 'L2 L3 DATA';
        data.setClass('data-node-layer2-layer3', true);
        data.setClass('data-node-layer3', false);
    }

    removeLayer2Header(data: Packet): void {
        data.layer2header.macSender = '';
        data.layer2header.macReceiver = '';
        data.name = 'L3    DATA';
        data.setClass('data-node-layer2-layer3', false);
        data.setClass('data-node-layer3', true);
    }

    populateArpTable(ip: string, mac: string, courier: Courier): void {
        this.arpTableMacIp.set(mac, ip);
        this.arpTableIpMac.set(ip, mac);

        //send out pending Packets after getting ARP table populated
        if (this.pendingPackets.has(ip)) {
            this.pendingPackets.get(ip)!.forEach((dataId) => {
                const data = courier.diagram.node<Packet>(dataId);
                if (!data) return;
                const source = courier.diagram.node<PhysicalNode>(courier.diagram.ipv4Database.get(data.layer3header.ipSender));
                if (!source) return;
                let portToSend: number | null = null;
                source.portData.forEach((value, port) => {
                    if (value.get('IPv4').address == data.layer3header.ipSender) {
                        portToSend = port;
                    }
                });
                this.sendDataInSameNetwork(
                    portToSend,
                    data,
                    data.layer2header.macSender,
                    mac,
                    ip,
                    courier
                );
            });
            this.pendingPackets.set(ip, []);
        }
    }

    populateRoutingTableOnNewData(previousId: string, data: Data, courier: Courier): void {
        const portIn = this.getPortIn(previousId, courier.diagram);

        if (this.has('router-node')) {
            if (data instanceof Frame && data.name.includes('ARP res')) {
                courier.blinkingThenRemove('discard-data-node-2part', data);
            } else if (data instanceof Frame && data.name.includes('ARP req')) {
                courier.blinkingThenRemove('processing-data-node-2part', data);
            } else {
                courier.blinkingThenRemove('discard-data-node-3part', data);
            }
            return;
        }

        if (data instanceof Frame) {
            const destination: string = data.layer2header.ipSender;
            if (this.checkIfSameNetwork(this.portData.get(portIn!)!.get('IPv4').address, destination, courier)) {
                const routingData = new RoutingData(
                    destination,
                    'on-link',
                    32,
                    this.portData.get(portIn!)!.get('Name'),
                    portIn!
                );
                this.routingTable.set(destination, routingData);
            }
            courier.blinkingThenRemove('processing-data-node-2part', data);
        } else if (data instanceof Packet) {
            const senderIp = data.layer3header.ipSender;
            const gatewayIp = this.arpTableMacIp.get(data.layer2header.macSender);
            let routingData: RoutingData;
            if (this.checkIfSameNetwork(data.layer3header.ipReceiver, senderIp, courier)) {
                routingData = new RoutingData(senderIp, 'on-link', 32, this.portData.get(portIn!)!.get('Name'), portIn!);
            } else {
                routingData = new RoutingData(senderIp, gatewayIp!, 32, this.portData.get(portIn!)!.get('Name'), portIn!);
            }

            this.routingTable.set(senderIp, routingData);
            courier.blinkingThenRemove('processing-data-node-3part', data);
        }
    }

    //longest match
    findPortToSend(ip: string): number | undefined {
        let longestPrefixMatch: number = 0;
        let port: number | undefined;

        this.routingTable.forEach((attributes, address) => {
            const numOfMatchedPrefix = AddressingHelper.getPrefix([
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
        return port;
    }

    getNextGateway(ip: string): string | null {
        let nextHop: string | null = null;
        let longestPrefixMatch: number = 0;

        this.routingTable.forEach((attributes, address) => {
            const numOfMatchedPrefix = AddressingHelper.getPrefix([
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

    checkIfSameNetwork(source: string, destination: string, courier: Courier): boolean {
        const diagram = courier.diagram;
        const destId = diagram.ipv4Database.get(destination);
        const destNode = diagram.node(destId);

        if (this.parent) {
            const net = diagram.netOf(this.id)!;
            return (
                net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
                AddressingHelper.decimalStringWithDotToBinary(destination).slice(0, net.bitmask)
            );
        } else if (destNode?.parent) {
            const net = diagram.netOf(destId!)!;
            return (
                net.networkAddress.binaryOctets.join('').slice(0, net.bitmask) ==
                AddressingHelper.decimalStringWithDotToBinary(source).slice(0, net.bitmask)
            );
        }
        return !!destNode && this.has('router-node') && destNode.has('router-node');
    }

    override flood(data: Data, previousId: string | null, port: number | null, courier: Courier): void {
        courier.diagram.removeNode(data.id);

        this.portLinkMapping.forEach((linkId, portIn) => {
            const edge = linkId ? courier.diagram.edges.get(linkId) : undefined;
            if (!edge) return;
            const directTargetId = edge.target == this.id ? edge.source : edge.target;
            const destination: string = data instanceof Frame ? data.layer2header.ipReceiver : (data as Packet).layer3header.ipReceiver;

            if (port == portIn || edge.target == previousId || edge.source == previousId) {
                //do not flood the incoming port
            } else if (!this.checkIfSameNetwork(this.portData.get(portIn!)!.get('IPv4').address, destination, courier)) {
                //do not flood other network
            } else {
                const copy = data instanceof Packet ? Packet.cloneData(data) : Frame.cloneData(data as Frame);
                courier.initThenDirectSend(this.id, directTargetId, copy);
            }
        });
    }
}
