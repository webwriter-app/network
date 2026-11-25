import { Address } from "./address";

export class Ipv6Address extends Address {
    static regex: RegExp = /([a-f0-9:]+:+)+[a-f0-9]+/;

    constructor(address: string, stringOctets: string[]){
        super(3);
        this.address = address;
        this.octets = stringOctets;
    }

    static getLoopBackAddress(): Ipv6Address{
        return new Ipv6Address("0:0:0:0:0:0:0:1", ["0","0","0","0","0","0","0","1"]);
    }

    static override validateAddress(address: string, database: Map<string, string>): Ipv6Address | null {
        if (database.has(address) || address=="" || address==undefined || address==null) {
            return null;
        }

        if (address=="0:0:0:0:0:0:0:1") return this.getLoopBackAddress();

        if (Ipv6Address.regex.test(address)) {
            let octets: string[] = address.split(':');
            let result = new Ipv6Address(address, octets);
            return result;
        }
        else {
            return null;
        }
    }
}