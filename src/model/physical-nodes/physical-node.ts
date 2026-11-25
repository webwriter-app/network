import { Ipv4Address } from '../addressing/ipv4-address';
import { GraphNode } from '../graph-node';

export type ConnectionType = 'wireless' | 'ethernet';

export abstract class PhysicalNode extends GraphNode {
    layer: number;
    numberOfInterfacesOrPorts: number;
    portData: Map<number, Map<string, any>> = new Map(); //update on changing data on edges
    backgroundPath!: string;
    portLinkMapping: Map<number, string> = new Map(); //updates on drawing edges (port-index, edge.id)

    //configure with subnetting extensions
    defaultGateway?: [string, number] | null; // id of gateway node (can't use type Router here because of recursive data), port-index

    constructor(color: string, layer: number, numberOfInterfacesOrPorts: number) {
        super(color);

        this.cssClass.push('physical-node');
        this.layer = layer;
        this.numberOfInterfacesOrPorts = numberOfInterfacesOrPorts;

        for (let i = 1; i <= numberOfInterfacesOrPorts; i++) {
            this.portData.set(i, new Map<string, any>());
            this.portLinkMapping.set(i, ''); //init port-link
        }
    }

    /** The name the saved data calls this kind of node. */
    abstract get kind(): string;

    getIpAddresses() {
        if (this.layer < 3) {
            return null;
        }
        let ipAddresses: Ipv4Address[] = [];
        this.portData.forEach(data => ipAddresses.push(data.get('IPv4')));
        return ipAddresses;
    }
}
