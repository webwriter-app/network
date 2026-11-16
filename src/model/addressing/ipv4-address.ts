import type { Net } from "../logical-nodes/net";
import { AddressingHelper } from "./addressing-helper";
import { Address } from "./address";

export class Ipv4Address extends Address {
    binaryOctets: string[];
    decimalOctets: number[];

    constructor(ipAddress: string, stringOctets: string[], binaryOctets: string[], decimalOctets: number[]) {
        super(3);
        this.address = ipAddress;
        this.octets = stringOctets;
        this.binaryOctets = binaryOctets;
        this.decimalOctets = decimalOctets;
    }

    static getLoopBackAddress(): Ipv4Address {
        //the octets are set as null cause there's no computation needed for loopback address
        return new Ipv4Address("127.0.0.1", null!, null!, null!);
    }

    /**
     * 
     * @param ip an Ipv4 address (string) that's not validated
     * @param database of all "worldwide" addresses
     * @param bitmask only needed if the passed Address is of a net
     * @returns Ipv4 address from passed address string | null if the passed address string is not valid
     */
    static override validateAddress(ip: string, database: Map<string, string>, bitmask?: number): Ipv4Address | null {
        let isNetworkId: boolean = (bitmask != null && !Number.isNaN(bitmask) && bitmask != undefined);

        if (ip == null || ip == undefined || ip == "" || database.has(ip)) return null;
        if (isNetworkId && (bitmask! < 0 || bitmask! > 32)) return null;

        if (ip == "127.0.0.1") if (!isNetworkId) { return this.getLoopBackAddress(); } else { return null; }

        let stringArray = ip.split('.');
        if (stringArray.length != 4) return null;

        let decimalArray: number[] = [];
        let binArray: string[] = [];
        let outOfRange: boolean = false;

        stringArray.forEach(octet => {
            let intOctet = parseInt(octet);
            if (intOctet == undefined || intOctet < 0 || intOctet > 255) outOfRange = true;
            decimalArray.push(intOctet);
            binArray.push(AddressingHelper.numTo8BitBinary(intOctet));
        });

        if (outOfRange) return null;

        let result: Ipv4Address = new Ipv4Address(ip, stringArray, binArray, decimalArray);

        if (isNetworkId && parseInt(binArray.join('').slice(bitmask)) * 10 != 0 && bitmask! < 32) return null;

        return result;
    }

    /**
     * 
     * @param database ipv4 database
     * @param oldIp current ipv4 address of a host
     * @param net the current network that host's in
     * @returns current ipv4 if it matches network CIDR, else a random new address that matches network CIDR (except for reserved addresses of net)
     */
    static generateNewIpGivenNet(database: Map<string, string>, oldIp: Ipv4Address, net: Net): Ipv4Address | null {

        if (net.cssClass.includes('unconfigured-net')) return null;

        if (oldIp.matchesNetworkCidr(net)) {
            return oldIp;
        }

        let netPrefix: string = net.networkAddress.binaryOctets.join('').slice(0, net.bitmask);
        let candidateIp: string = netPrefix;

        let reservedAddresses: string[] = ["127.0.0.1", netPrefix.padEnd(32, '1'), netPrefix.padEnd(32, '0')];

        while (candidateIp.length != 32) {
            candidateIp += AddressingHelper.randomBetween(0, 1);
        }
        let ip = AddressingHelper.binaryToDecimalOctets(candidateIp).join('.');

        let n: number = 10; //TODO: how many iterations is appropriate?
        //if randomized ip exists/reserved, regenerate another IP (set timeout to n iterations)
        while (n > 0 && (database.has(ip) || reservedAddresses.includes(candidateIp))) {
            candidateIp = netPrefix;
            while (candidateIp.length != 32) {
                candidateIp += AddressingHelper.randomBetween(0, 1);
            }
            ip = AddressingHelper.binaryToDecimalOctets(candidateIp).join('.');
            n--;
        }

        database.delete(oldIp.address);
        if (database.has(ip)) return null;
        let result = this.validateAddress(ip, database);
        return result;
    }

    /**
     * 
     * @param net 
     * @returns whether this ipv4 address matches network CIDR
     */
    matchesNetworkCidr(net: Net): boolean {
        if (this.address == "127.0.0.1") return true; //exclude loop-back address
        if (net.cssClass.includes('unconfigured-net')) return false;

        let binaryCompoundArray = net.networkAddress.binaryOctets;
        let binaryNodeArray = this.binaryOctets;
        if (binaryCompoundArray.join('').slice(0, net.bitmask) == binaryNodeArray.join('').slice(0, net.bitmask)) {
            return true;
        }
        return false;
    }

    static override addAddressToDatabase(address: Address, database: Map<string, string>, nodeId: string, bitmask?: number): void {
        if (address.address == "127.0.0.1") return;
        database.set(address.address, nodeId);
        if (bitmask != null && bitmask != undefined && !Number.isNaN(bitmask)) {
            database.set(AddressingHelper.getBroadcastAddress(address.address, bitmask), nodeId + "|" + "broadcast");
        }
    }

    static override removeAddressFromDatabase(address: Address, database: Map<string, string>, bitmask?: number): void {
        database.delete(address.address);
        if (bitmask != null && bitmask != undefined && !Number.isNaN(bitmask)) {
            database.delete(AddressingHelper.getBroadcastAddress(address.address, bitmask));
        }
    }
}