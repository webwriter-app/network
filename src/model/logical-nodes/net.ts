import type { Diagram } from '../diagram';
import { Ipv4Address } from '../addressing/ipv4-address';
import { AddressingHelper } from '../addressing/addressing-helper';
import { GraphNode } from '../graph-node';
import type { Router } from '../physical-nodes/connector';
import type { PhysicalNode } from '../physical-nodes/physical-node';
import { LogicalNode } from './logical-node';

export class Net extends LogicalNode {
    bitmask!: number;
    networkAddress!: Ipv4Address;
    netmask!: string;
    binaryNetmask!: string;

    //this is updated on drag-and-drop
    gateways: Map<string, number> = new Map(); //(routerId, portIndex)
    currentDefaultGateway!: [string, number];

    constructor(
        color: string,
        netAd: string,
        netmask: string | null,
        bitmask: number | null,
        database: Map<string, string>,
        id?: string,
        diagram?: Diagram,
        announce: boolean = id == null || id == ''
    ) {
        super(color);
        const msg = diagram?.msg ?? ((text: string) => text);

        this.bitmask = bitmask!;
        this.netmask = netmask!;
        this.binaryNetmask = '';
        this.networkAddress = null!;

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            let number = 0;
            while (diagram?.nodes.has('net' + number)) number++;
            this.id = 'net' + number;
        }

        this.cssClass.push('net-node');

        //if bitmask is not null, calculate equivalent netmask
        if (bitmask != null) {
            this.bitmask = bitmask;
            this.binaryNetmask = ''.padStart(bitmask, '1').padEnd(32, '0');
            let derivedDecimalMask: number[] = AddressingHelper.binaryToDecimalOctets(this.binaryNetmask);
            //if the input netmask is valid and doesn't match our bitmask
            this.netmask = derivedDecimalMask.join('.');
            if (netmask != null && derivedDecimalMask.join('.') != netmask) {
                diagram?.notify(
                    'warning',
                    '',
                    msg('The  netmask you entered') + ' ' +
                        netmask + ' ' +
                        msg("doesn't match the bitmask") + ' ' +
                        this.bitmask +
                        '. ' + msg('Derived netmask is') + ': ' +
                        this.netmask
                );
            }
        } else if (netmask != null) {
            //if bitmask is null, netmask!=null --> calculate bitmask from netmask
            this.netmask = netmask;
            this.binaryNetmask = AddressingHelper.decimalStringWithDotToBinary(netmask);
            this.bitmask = (this.binaryNetmask.match(new RegExp('1', 'g')) || []).length;
        }

        let networkId = Ipv4Address.validateAddress(netAd, database, this.bitmask);
        if (networkId == null) {
            if (announce) diagram?.notify('danger', msg('Provided network ID is not valid.'), '');

            this.setClass('unconfigured-net', true);
            return;
        }

        this.networkAddress = networkId;
        this.name =
            this.networkAddress != null && this.bitmask != undefined
                ? this.networkAddress.address + ' /' + this.bitmask
                : '';
        Ipv4Address.addAddressToDatabase(this.networkAddress, database, this.id, this.bitmask);
    }

    /**
     * Filter for valid bitmask and netmask
     * @param color
     * @param netAd
     * @param netmask
     * @param bitmask
     * @param database
     * @returns
     */
    static createNet(
        color: string,
        netAd: string,
        netmask: string,
        bitmask: number,
        database: Map<string, string>,
        diagram: Diagram,
        id?: string
    ): Net | null {
        let bitmaskValid: boolean = !(
            bitmask == null ||
            bitmask == undefined ||
            Number.isNaN(bitmask) ||
            bitmask < 0 ||
            bitmask > 32
        );
        let netmaskValid: boolean = !(
            netmask == null ||
            netmask == undefined ||
            netmask == '' ||
            !AddressingHelper.validateNetMask(netmask)
        );

        if (!bitmaskValid && !netmaskValid) {
            if (diagram.subnettingMode == 'NET_BASED') {
                diagram.notify(
                    'danger',
                    diagram.msg('Net-based Mode for CIDR/Subnetting activated:'),
                    diagram.msg('Cannot create a net without both bitmask and netmask!')
                );
                return null;
            }
            let unconfiguredNet = new Net(
                color,
                netAd,
                netmaskValid ? netmask : null,
                bitmaskValid ? bitmask : null,
                database,
                id,
                diagram
            );
            unconfiguredNet.setClass('unconfigured-net', true);
            return unconfiguredNet;
        }
        return new Net(color, netAd, netmaskValid ? netmask : null, bitmaskValid ? bitmask : null, database, id, diagram);
    }

    /**
     * Calculate the network CIDR when a host is dragged into the network
     *
     * @param net A network
     * @param ip The Ipv4 Address of a new host
     * @param database Ipv4 database
     */
    static calculateCIDRGivenNewHost(
        net: Net,
        ip: Ipv4Address,
        database: Map<string, string>,
        diagram: Diagram
    ): void {
        if (diagram.subnettingMode != 'HOST_BASED' || ip.matchesNetworkCidr(net)) {
            return;
        }
        let count: number;
        let candidateId: string;
        if (!net.cssClass.includes('unconfigured-net')) {
            let oldPrefix = net.networkAddress.binaryOctets.join('').slice(0, net.bitmask);
            let newPrefix = AddressingHelper.getPrefix([oldPrefix, ip.binaryOctets.join('')]);
            count = newPrefix.length;
            candidateId = newPrefix.padEnd(32, '0');
        } else {
            count = 30;
            candidateId = ip.binaryOctets.join('').slice(0, count).padEnd(32, '0');
        }
        this.testPossibleNetAddresses(count, candidateId, net, database, diagram);
    }

    private static testPossibleNetAddresses(
        count: number,
        candidateId: string,
        net: Net,
        database: Map<string, string>,
        diagram: Diagram
    ): void {
        if (diagram.subnettingMode != 'HOST_BASED') return;
        if (net.networkAddress != null && net.networkAddress != undefined) {
            Ipv4Address.removeAddressFromDatabase(net.networkAddress, database, net.bitmask);
        }

        let candidateIdFormatted = AddressingHelper.binaryToDecimalOctets(candidateId).join('.');
        let candidateAddress = Ipv4Address.validateAddress(candidateIdFormatted, database, count);

        while (count > 0 && candidateAddress == null) {
            candidateId = AddressingHelper.replaceAt(candidateId, count, '0');
            candidateIdFormatted = AddressingHelper.binaryToDecimalOctets(candidateId).join('.');
            candidateAddress = Ipv4Address.validateAddress(candidateIdFormatted, database, count);
            count--;
        }

        //if no net address is available
        if (candidateAddress == null) {
            diagram.notify(
                'warning',
                diagram.msg('Hosts-based mode:'),
                diagram.msg('No valid network address can be assigned to this net.')
            );
            net.setNetInfo(null, null, null, null, true, '');
            return;
        } else {
            net.setNetInfo(
                candidateAddress,
                count,
                AddressingHelper.binaryToDecimalOctets(''.padStart(count, '1').padEnd(32, '0')).join('.'),
                ''.padStart(count, '1').padEnd(32, '0'),
                false
            );
            Ipv4Address.addAddressToDatabase(net.networkAddress, database, net.id, net.bitmask);
        }
    }

    /**
     * Calculate the network CIDR when a net is dragged into the net
     *
     * @param supernet A network
     * @param subnet A network that is dragged into the supernet
     * @param database Ipv4 database
     */
    static calculateCIDRGivenNewSubnet(
        supernet: Net,
        subnet: Net,
        database: Map<string, string>,
        diagram: Diagram
    ): void {
        if (
            diagram.subnettingMode != 'HOST_BASED' ||
            supernet.isSupernetOf(subnet) ||
            subnet.cssClass.includes('unconfigured-net')
        )
            return;

        let count: number;
        let candidateId: string;
        if (!supernet.cssClass.includes('unconfigured-net')) {
            let oldSupernetPrefix = supernet.networkAddress.binaryOctets.join('').slice(0, supernet.bitmask);
            let subnetPrefix = subnet.networkAddress.binaryOctets.join('').slice(0, subnet.bitmask);
            let newPrefix = AddressingHelper.getPrefix([oldSupernetPrefix, subnetPrefix]);
            count = newPrefix.length;
            candidateId = newPrefix.padEnd(32, '0');
        } else {
            count = subnet.bitmask - 1;
            let subnetPrefix = subnet.networkAddress.binaryOctets.join('').slice(0, subnet.bitmask);
            candidateId = AddressingHelper.replaceAt(subnetPrefix, count, '0').padEnd(32, '0');
        }
        Net.testPossibleNetAddresses(count, candidateId, supernet, database, diagram);
    }

    validateNetLocally(hosts: GraphNode[], gateways: Router[], diagram: Diagram, noAlert: boolean): boolean {
        if (this.cssClass.includes('unconfigured-net')) return false;
        let allCorrect: boolean = true;
        let unmatchedPairs: Map<string, [string, string]> = new Map(); //("host", [type of host, name])

        let shouldContains: Map<string, string> = new Map(); //(ip, name)
        hosts.forEach((host) => {
            if (host.has('physical-node') && (host as PhysicalNode).layer > 2) {
                (host as PhysicalNode).portData.forEach((data) => {
                    if (!data.get('IPv4').matchesNetworkCidr(this)) {
                        unmatchedPairs.set(data.get('IPv4').address, ['host', host.name]);
                        allCorrect = false;
                    }
                });
            } else if (host instanceof Net) {
                if (!this.isSupernetOf(host) && !host.cssClass.includes('unconfigured-net')) {
                    unmatchedPairs.set(host.name, ['net', host.name]);
                    allCorrect = false;
                }
            }
        });
        gateways.forEach((gateway) => {
            let port = this.gateways.get(gateway.id);
            let ip4 = gateway.portData.get(port!)!.get('IPv4');
            if (!ip4.matchesNetworkCidr(this)) {
                unmatchedPairs.set(ip4.address, ['gateway', gateway.name]);
                allCorrect = false;
            }
        });

        diagram
            .physicalNodes()
            .filter((host) => host.has('host-node') && !host.parent)
            .forEach((host) => {
                host.portData.forEach((data: any) => {
                    let ip4 = data.get('IPv4');
                    if (ip4.matchesNetworkCidr(this) && ip4.address != '127.0.0.1') {
                        shouldContains.set(ip4.address, host.name);
                        allCorrect = false;
                    }
                });
            });

        if (allCorrect) return true;

        if (noAlert && !allCorrect) return false;

        const lines: string[] = [];
        if (unmatchedPairs.size != 0) {
            lines.push('should not contain:');
            unmatchedPairs.forEach(([type, name], node) => {
                switch (type) {
                    case 'host':
                        lines.push(`• ${diagram.msg("Host")} ` + name + ': ' + node);
                        break;
                    case 'net':
                        lines.push(`• ${diagram.msg("Net")} ` + node);
                        break;
                    case 'gateway':
                        lines.push(`• ${diagram.msg("Gateway")} ` + name + ': ' + node);
                        break;
                }
            });
        }
        if (shouldContains.size != 0) {
            lines.push(`${diagram.msg("should contain")}:`);
            shouldContains.forEach((name, ip) => {
                lines.push(`• ${diagram.msg("Host")} ` + name + ` ${diagram.msg("with address")} ` + ip);
            });
        }
        const alert = lines.join('\n');

        diagram.notify('warning', `${diagram.msg("Network")} ` + this.name, alert);
        return false;
    }

    isSupernetOf(subnet: Net): boolean {
        if (
            subnet == null ||
            this.cssClass.includes('unconfigured-net') ||
            subnet.cssClass.includes('unconfigured-net')
        ) {
            return false;
        }
        if (this.bitmask >= subnet.bitmask) return false;
        return (
            this.networkAddress.binaryOctets.join('').slice(0, this.bitmask) ==
            subnet.networkAddress.binaryOctets.join('').slice(0, this.bitmask)
        );
    }

    private setNetInfo(
        networkAddress: Ipv4Address | null,
        bitmask: number | null,
        netmask: string | null,
        binaryNetmask: string | null,
        unconfig: boolean,
        name?: string
    ) {
        this.bitmask = bitmask!;
        this.networkAddress = networkAddress!;
        this.netmask = netmask!;
        this.binaryNetmask = binaryNetmask!;
        this.name = name != null ? (this.name = name) : this.networkAddress.address + ' /' + this.bitmask;
        if (!unconfig) {
            while (this.cssClass.includes('unconfigured-net')) {
                this.cssClass.splice(this.cssClass.indexOf('unconfigured-net'), 1);
            }
        } else {
            this.cssClass.push('unconfigured-net');
        }
    }

    handleChangesOnNewNetInfo(
        newNetId: string | null,
        newnetmask: string | null,
        newBitmask: number | null,
        diagram: Diagram
    ): boolean {
        let bitmaskValid: boolean = !(
            newBitmask == null ||
            newBitmask == undefined ||
            Number.isNaN(newBitmask) ||
            newBitmask < 0 ||
            newBitmask > 32
        );
        let netmaskValid: boolean = !(
            newnetmask == null ||
            newnetmask == undefined ||
            newnetmask == '' ||
            !AddressingHelper.validateNetMask(newnetmask)
        );

        let networkToFree: [string, number] | null = !this.cssClass.includes('unconfigured-net')
            ? [this.networkAddress.address, this.bitmask]
            : null;

        if (!bitmaskValid && !netmaskValid) return false;

        //if bitmask valid, calculate equivalent net mask
        if (bitmaskValid) {
            let derivedDecimalMask: number[] = AddressingHelper.binaryToDecimalOctets(
                ''.padStart(newBitmask!, '1').padEnd(32, '0')
            );
            //if the input netmask is valid and doesn't match our bitmask
            if (netmaskValid && derivedDecimalMask.join('.') != newnetmask) {
                diagram.notify(
                    'warning',
                    '',
                    `${diagram.msg("The netmask you entered")} ` +
                        newnetmask +
                        ` ${diagram.msg("doesn't match the bitmask")} ` +
                        newBitmask +
                        `. ${diagram.msg("Derived netmask is")}: ` +
                        derivedDecimalMask.join('.')
                );
            }
            newnetmask = derivedDecimalMask.join('.');
        } else if (netmaskValid) {
            //if bitmask not valid --> calculate bitmask from netmask
            newBitmask = (AddressingHelper.decimalStringWithDotToBinary(newnetmask!).match(new RegExp('1', 'g')) || [])
                .length;
        }

        if (
            this.networkAddress != null &&
            newNetId == this.networkAddress.address &&
            (this.bitmask == undefined || this.bitmask == null || this.bitmask >= newBitmask!)
        ) {
            diagram.ipv4Database.delete(
                AddressingHelper.getBroadcastAddress(this.networkAddress.address, this.bitmask)
            );
            this.setNetInfo(
                this.networkAddress,
                newBitmask,
                newnetmask,
                AddressingHelper.decimalStringWithDotToBinary(newnetmask!),
                false
            );
            diagram.ipv4Database.set(
                AddressingHelper.getBroadcastAddress(this.networkAddress.address, this.bitmask),
                null!
            );
            diagram.notify('success', diagram.msg('Your changes have been saved.'), '');
            return true;
        }

        let networkId = Ipv4Address.validateAddress(newNetId!, diagram.ipv4Database, newBitmask!);

        if (networkId == null) return false;

        switch (diagram.subnettingMode) {
            case 'HOST_BASED':
                if (
                    this.bitmask >= newBitmask! &&
                    this.networkAddress.binaryOctets.join('').slice(0, newBitmask!) ==
                        networkId.binaryOctets.join('').slice(0, newBitmask!)
                ) {
                    this.setNetInfo(
                        networkId,
                        newBitmask,
                        newnetmask,
                        AddressingHelper.decimalStringWithDotToBinary(newnetmask!),
                        false
                    );
                } else {
                    diagram.notify(
                        'danger',
                        diagram.msg('Host-based mode on:'),
                        diagram.msg("New network doesn't extend old network!")
                    );
                    return false;
                }
                break;

            case 'NET_BASED':
                this.setNetInfo(
                    networkId,
                    newBitmask,
                    newnetmask,
                    AddressingHelper.decimalStringWithDotToBinary(newnetmask!),
                    false
                );

                diagram
                    .childrenOf(this.id)
                    .forEach((nodeData) => {
                        if (nodeData.has('physical-node') && (nodeData as PhysicalNode).layer > 2) {
                            (nodeData as PhysicalNode).portData.forEach((data: any) => {
                                let ip4 = data.get('IPv4');
                                if (ip4 != null && !ip4.matchesNetworkCidr(this)) {
                                    Ipv4Address.removeAddressFromDatabase(ip4, diagram.ipv4Database);
                                    let newIpv4 = Ipv4Address.generateNewIpGivenNet(diagram.ipv4Database, ip4, this);
                                    data.set('IPv4', newIpv4);
                                    Ipv4Address.addAddressToDatabase(newIpv4!, diagram.ipv4Database, nodeData.id);
                                }
                            });
                        } else if (nodeData instanceof Net) {
                            //if the subnet doesn't match supernet's CIDR
                            if (!this.isSupernetOf(nodeData)) {
                                diagram.ipv4Database.delete(nodeData.networkAddress.address); //delete the subnet from database
                                diagram.ipv4Database.delete(
                                    AddressingHelper.getBroadcastAddress(
                                        nodeData.networkAddress.address,
                                        nodeData.bitmask
                                    )
                                );
                                nodeData.networkAddress = null!; //delete the subnet Address
                                nodeData.setClass('unconfigured-net', true);
                                nodeData.name = '';
                            }
                        }
                    });
                this.gateways.forEach((port, id) => {
                    let gateway = diagram.node<PhysicalNode>(id);
                    if (!gateway) return;
                    let ip4 = gateway.portData.get(port)?.get('IPv4');
                    if (ip4 != null && !ip4.matchesNetworkCidr(this)) {
                        Ipv4Address.removeAddressFromDatabase(ip4, diagram.ipv4Database);
                        let newIp4 = Ipv4Address.generateNewIpGivenNet(diagram.ipv4Database, ip4, this);
                        gateway.portData.get(port)!.set('IPv4', newIp4);
                        Ipv4Address.addAddressToDatabase(newIp4!, diagram.ipv4Database, gateway.id);
                    }
                });
                break;
            case 'MANUAL':
                this.setNetInfo(
                    networkId,
                    newBitmask,
                    newnetmask,
                    AddressingHelper.decimalStringWithDotToBinary(newnetmask!),
                    false
                );
                break;
        }

        if (networkToFree != null) {
            diagram.ipv4Database.delete(AddressingHelper.getBroadcastAddress(networkToFree[0], networkToFree[1]));
            diagram.ipv4Database.delete(networkToFree[0]);
        }
        diagram.notify('success', diagram.msg('Your changes have been saved.'), '');
        return true;
    }
}

export type SubnettingMode = 'NET_BASED' | 'HOST_BASED' | 'MANUAL';
