import { biBroadcastPin, biHdd, biRouter, iBridge, iHub, iSwitch, iconToDataURI } from '../../styles/icons';
import { Ipv4Address } from '../../adressing/Ipv4Address';
import { Ipv6Address } from '../../adressing/Ipv6Address';
import { MacAddress } from '../../adressing/MacAddress';
import { Net } from '../logicalNodes/Net';
import { ConnectionType, PhysicalNode } from './PhysicalNode';
import { sourceMsg } from "../../../localization/localizer";

export abstract class Connector extends PhysicalNode {
    constructor(
        color: string,
        layer: number,
        numberOfInterfacesOrPorts: number,
        names: Map<number, string> | null,
        portConnectionTypes: Map<number, ConnectionType> | null,
        connectionType?: ConnectionType
    ) {
        super(color, layer, numberOfInterfacesOrPorts);

        if (this.layer > 2) {
            for (let index = 1; index <= numberOfInterfacesOrPorts; index++) {
                let name = names?.get(index);
                if (name != undefined && name != null && name != '') {
                    this.portData.get(index)!.set('Name', name);
                } else {
                    this.portData
                        .get(index)!
                        .set(
                            'Name',
                            portConnectionTypes != null
                                ? (portConnectionTypes.get(index) ?? '') + index
                                : connectionType != null
                                ? connectionType + index
                                : index
                        );
                }
            }
        }

        if (connectionType != null && connectionType != undefined) {
            this.portData.forEach((data, port) => {
                if (port <= this.numberOfInterfacesOrPorts) data.set('Connection Type', connectionType);
            });
        } else if (portConnectionTypes != null) {
            portConnectionTypes.forEach((connectionType, port) => {
                if (port <= this.numberOfInterfacesOrPorts)
                    this.portData.get(port)!.set('Connection Type', connectionType);
            });
        }
        this.cssClass.push('connector-node');
    }
}

export class Router extends Connector {
    //TODO: portLinkMapping bị xóa
    //--> check + remove router (remove bằng routerid + port index) from list of gateways của net
    portNetMapping: Map<number, Net> = new Map(); //(port-index, id of net-node)
    nets: Net[] = [];

    constructor(
        color: string,
        numberOfInterfaces: number,
        names: Map<number, string>,
        portConnectionTypes: Map<number, ConnectionType>,
        portMacMapping: Map<number, MacAddress>,
        portIpv4Mapping: Map<number, Ipv4Address>,
        portIpv6Mapping: Map<number, Ipv6Address>,
        name?: string,
        id?: string
    ) {
        super(color, 3, numberOfInterfaces, names, portConnectionTypes);

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'router' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = 'Router';
        }

        portMacMapping.forEach((macAddress, port) => {
            this.portData.get(port)!.set('MAC', macAddress);
        });
        portIpv4Mapping.forEach((ip4, port) => {
            this.portData.get(port)!.set('IPv4', ip4);
        });
        portIpv6Mapping.forEach((ip6, port) => {
            this.portData.get(port)!.set('IPv6', ip6);
        });

        this.cssClass.push('router-node');
        this.backgroundPath = iconToDataURI(biRouter);
    }
}

export class Repeater extends Connector {
    constructor(color: string, portConnectionTypes: Map<number, ConnectionType>, name?: string, id?: string) {
        super(color, 1, 2, null, portConnectionTypes);

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'repeater' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = sourceMsg('Repeater');
        }

        this.cssClass.push('repeater-node');
        this.backgroundPath = iconToDataURI(biHdd);
    }
}

export class Hub extends Connector {
    constructor(color: string, numberOfPorts: number, name?: string, id?: string) {
        super(color, 1, numberOfPorts != null && numberOfPorts != 0 ? numberOfPorts : 2, null, null, 'ethernet');

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'hub' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = 'Hub';
        }

        this.cssClass.push('hub-node');
        this.backgroundPath = iconToDataURI(iHub);
    }
}

export class Switch extends Connector {
    constructor(
        color: string,
        numberOfPorts: number,
        portMacMapping: Map<number, MacAddress>,
        name?: string,
        id?: string
    ) {
        super(color, 2, numberOfPorts != null && numberOfPorts != 0 ? numberOfPorts : 2, null, null, 'ethernet');

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'switch' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = 'Switch';
        }
        portMacMapping.forEach((macAddress, port) => {
            this.portData.get(port)!.set('MAC', macAddress);
        });
        this.cssClass.push('switch-node');
        this.backgroundPath = iconToDataURI(iSwitch);
    }
}

export class Bridge extends Connector {
    constructor(
        color: string,
        portConnectionTypes: Map<number, ConnectionType>,
        portMacMapping: Map<number, MacAddress>,
        name?: string,
        id?: string
    ) {
        super(color, 2, 2, null, portConnectionTypes);

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'bridge' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = sourceMsg('Bridge');
        }

        portMacMapping.forEach((macAddress, port) => {
            if (port <= this.numberOfInterfacesOrPorts) this.portData.get(port)!.set('MAC', macAddress);
        });

        this.cssClass.push('bridge-node');
        //change icon
        this.backgroundPath = iconToDataURI(iBridge);
    }
}

export class AccessPoint extends Connector {
    constructor(
        color: string,
        numberOfPorts: number,
        portMacMapping: Map<number, MacAddress>,
        name?: string,
        id?: string
    ) {
        let ports = numberOfPorts != null && numberOfPorts != 0 ? numberOfPorts : 2;
        let connections: Map<number, ConnectionType> = new Map();

        for (let index = 1; index <= ports; index++) {
            if (index == 1) {
                connections.set(index, 'ethernet');
            } else {
                connections.set(index, 'wireless');
            }
        }

        super(color, 2, ports, null, connections);

        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'accessPoint' + crypto.randomUUID();
        }

        if (name != null && name != undefined && name != '') {
            this.name = name;
        } else {
            this.name = sourceMsg('Access Point');
        }
        portMacMapping.forEach((macAddress, port) => {
            this.portData.get(port)!.set('MAC', macAddress);
        });

        this.cssClass.push('access-point-node');
        this.backgroundPath = iconToDataURI(biBroadcastPin);
    }
}
