import { AddressingHelper } from "./addressing/addressing-helper";

export class RoutingData {
    destination!: string;
    gateway!: string;
    netmask: string;
    bitmask: number;
    interfaceName: string;
    port: number;

    constructor(destination: string, gateway: string, bitmask: number, interfaceName: string, port: number) {
        this.bitmask = bitmask;
        this.netmask = AddressingHelper.binaryToDecimalOctets("".padEnd(bitmask, "1").padEnd(32, "0")).join('.');
        this.port = port;
        this.interfaceName = interfaceName;
        if (RoutingData.validateAddressSchema(destination)) this.destination = destination;
        if (gateway=="on-link" || RoutingData.validateAddressSchema(gateway)) this.gateway = gateway;
    }

    static validateAddressSchema(address: string): boolean {
        let stringArray = address.split('.');
        if (stringArray.length != 4) return false;

        let outOfRange: boolean = false;

        stringArray.forEach(octet => {
            let intOctet = parseInt(octet);
            if (intOctet == undefined || intOctet < 0 || intOctet > 255) outOfRange = true;
        });

        if (outOfRange) return false;
        return true;
    }
}