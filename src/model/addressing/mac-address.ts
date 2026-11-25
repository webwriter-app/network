import { AddressingHelper } from "./addressing-helper";
import { Address } from "./address";

export class MacAddress extends Address {
    static regex: RegExp = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    constructor(macAddress: string, stringOctets: string[]) {
        super(2);
        this.address = macAddress;
        this.octets = stringOctets;
    }

    /**
     * @param database of "worldwide" MAC addresses
     * @returns a random unique MAC address
     */
    static generateRandomAddress(database: Map<string, string>): MacAddress {
        let macArray: string[] = [AddressingHelper.randomHex(), AddressingHelper.randomHex(), AddressingHelper.randomHex(),
        AddressingHelper.randomHex(), AddressingHelper.randomHex(), AddressingHelper.randomHex()];
        let newMac: string = macArray.join(':');

        //get a new randomized MAC address if the generated one exists
        while (database.has(newMac)) {
            let randomAgain = AddressingHelper.randomBetween(0, 5);
            macArray[randomAgain] = AddressingHelper.randomHex();
            newMac = macArray.join(':');
        }

        let result = new MacAddress(newMac, macArray);

        return result;
    }


    static override validateAddress(mac: string, database: Map<string, string>): MacAddress | null {
        if (database.has(mac) || mac=="" || mac==undefined || mac==null) {
            return null;
        }

        if (MacAddress.regex.test(mac)) {
            let macArray: string[] = mac.split(':');
            let result = new MacAddress(mac, macArray);
            return result;
        }
        else {
            return null;
        }
    }

}