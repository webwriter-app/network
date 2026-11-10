import { sourceMsg } from "../../localization/localizer";

export class AddressingHelper {
    static numTo8BitBinary(num: number): string {
        if (num < 0) throw new Error(sourceMsg("Octets shouldn't be of negative value"));
        if (num == undefined || num == 0) {
            return "00000000";
        }
        let binary = num.toString(2);
        return binary.padStart(8, "0");
    }

    static binaryToDecimalOctets(binary: string): number[] {
        if (binary.length != 32 || !/^[01]+$/.test(binary)) {
            return null!;
        }
        return [parseInt(binary.slice(0, 8), 2), parseInt(binary.slice(8, 16), 2),
        parseInt(binary.slice(16, 24), 2), parseInt(binary.slice(24, 32), 2)];
    }

    static decimalStringWithDotToBinary(decimal: string): string {
        let decimalOctets: string[] = decimal.split('.');
        let bin = "";
        if (decimalOctets.length != 4) {
            return null!;
        }
        else {
            decimalOctets.forEach(octet => bin += (+octet).toString(2).padStart(8, "0"));
            return bin;
        }
    }

    static getBroadcastAddress(networkId: string, bitmask: number){
        let binId = this.decimalStringWithDotToBinary(networkId);
        let prefix = binId.slice(0, bitmask);
        return this.binaryToDecimalOctets(prefix.padEnd(32,'1')).join('.');
    }

    static getPrefix(strings: string[]) {
        // check border cases size 1 array and empty first word)
        if (!strings[0] || strings.length == 1) return strings[0] || "";
        let i = 0;
        // while all words have the same character at position i, increment i
        while (strings[0][i] && strings.every(w => w[i] === strings[0][i]))
            i++;

        // prefix is the substring from the beginning to the last successfully checked i
        return strings[0].substring(0, i);
    }

    static randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    //random a heximal number of 2 digits
    static randomHex(): string {
        let hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        return hexRef[this.randomBetween(0, 15)] + hexRef[this.randomBetween(0, 15)];
    }

    static replaceAt(origin: string, index: number, replacement: string): string {
        if (index >= origin.length || index < 0 || replacement.length != 1) return null!;
        return origin.substring(0, index) + replacement + origin.substring(index + 1);
    }

    static validateNetMask(netmask: string): boolean {
        if (!/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/.test(netmask)) return false;
        let binMask: string = AddressingHelper.decimalStringWithDotToBinary(netmask);
        if (binMask.length != 32) return false;

        let ones: boolean = true;
        let zeros: boolean = false;
        for (let index = 0; index < binMask.length; index++) {
            let char = binMask.charAt(index);
            switch (char) {
                case '0':
                    if (ones) {
                        ones = false;
                        zeros = true;
                    }
                    break;
                case '1':
                    if (zeros) return false;
                    break;
                default: return false;
            }
        }
        return true;
    }
}



