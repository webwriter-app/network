import { Ipv4Address } from '../addressing/ipv4-address';
import { Ipv6Address } from '../addressing/ipv6-address';
import { MacAddress } from '../addressing/mac-address';
import { mobileNode } from '../node-graphics';
import { ConnectionType, PhysicalNode } from './physical-node';

export class Host extends PhysicalNode {
    constructor(
        color: string,
        icon: string,
        numberOfInterfaces: number,
        names: Map<number, string>,
        portConnectionTypes: Map<number, ConnectionType>,
        portMacMapping: Map<number, MacAddress>,
        portIpv4Mapping: Map<number, Ipv4Address>,
        portIpv6Mapping: Map<number, Ipv6Address>,
        name?: string,
        id?: string
    ) {
        super(color, 7, numberOfInterfaces);

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'host' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = 'Host';
        }

        for (let index = 1; index <= numberOfInterfaces; index++) {
            let name = names.get(index);
            if (name != undefined && name != null && name != '') {
                this.portData.get(index)!.set('Name', name);
            } else {
                this.portData.get(index)!.set('Name', (portConnectionTypes.get(index) ?? '') + index);
            }
        }

        portConnectionTypes.forEach((connectionType, port) => {
            this.portData.get(port)!.set('Connection Type', connectionType);
        });
        portMacMapping.forEach((macAddress, port) => {
            this.portData.get(port)!.set('MAC', macAddress);
        });
        portIpv4Mapping.forEach((ip4, port) => {
            this.portData.get(port)!.set('IPv4', ip4);
        });
        portIpv6Mapping.forEach((ip6, port) => {
            this.portData.get(port)!.set('IPv6', ip6);
        });

        this.cssClass.push('host-node');
        this.backgroundPath = icon;
    }

    get kind(): string {
        return this.backgroundPath === mobileNode ? 'mobile' : 'computer';
    }
}
