export abstract class Address {
    layer: number;
    address!: string;
    octets!: string[];

    constructor(layer: number) {
        this.layer = layer;
        if (layer < 2) {
            this.address = '';
        }
    }

    /**
     * will be overrided with concrete address types
     *
     * Validate and add new valid address to database
     * @param address
     * @param database
     * @returns of type Address if passed address string is valid (valid format + not preexisted in database) | null
     */
    static validateAddress(_address: string, _database: Map<string, string>): Address | null {
        return null;
    }

    static removeAddressFromDatabase(address: Address, database: Map<string, string>) {
        database.delete(address.address);
    }

    static addAddressToDatabase(address: Address, database: Map<string, string>, nodeId: string) {
        if (address.address == '127.0.0.1' || address.address == '0:0:0:0:0:0:0:1') return;
        database.set(address.address, nodeId);
    }
}
