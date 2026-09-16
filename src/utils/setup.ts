import { EventObject } from 'cytoscape';
import { NetworkComponent } from '..';
import { Ipv4Address } from '../adressing/Ipv4Address';
import { Ipv6Address } from '../adressing/Ipv6Address';
import { MacAddress } from '../adressing/MacAddress';
import { AccessPoint, Bridge, Hub, Repeater, Router, Switch } from '../components/physicalNodes/Connector';
import { Host } from '../components/physicalNodes/Host';
import { iconToDataURI, biPcDisplayHorizontal, biPhone } from '../styles/icons';
import { ConnectionType } from '../components/physicalNodes/PhysicalNode';
import { GraphEdge } from '../components/GraphEdge';
import { EdgeController } from '../event-handlers/edge-controller';
import { Net } from '../components/logicalNodes/Net';
import { Frame, Packet } from '../components/logicalNodes/DataNode';

export type Component = {
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;

    color: string;

    ports: Port[];
    portLinks: string[];

    defaultGateway?: string[];
};

type Port = {
    name: string;
    type: string;
    mac: string;
    ip4?: string;
    ip6?: string;
};

export type Connection = {
    id: string;
    from: string;
    to: string;
    inPort: number;
    outPort: number;

    color: string;
};

export type Network = {
    id: string;
    components: string[];
    gateways: string[];
    name: string;
    netmask: string;
    bitmask: number;
    address: string;

    currentDefaultGateway?: string;

    x: number;
    y: number;

    color: string;
};

export function load(this: NetworkComponent) {
    const components = this.components;
    const connections = this.connections;
    const networks = this.networks;

    components.forEach((c) => {
        console.log('load', c);
        let component: any;

        let portNames: Map<number, string> = new Map();
        let portConnectionTypes: Map<number, ConnectionType> = new Map();
        let portMacs: Map<number, MacAddress> = new Map();
        let portIpv4s: Map<number, Ipv4Address> = new Map();
        let portIpv6s: Map<number, Ipv6Address> = new Map();

        c.ports.forEach((p, index) => {
            portNames.set(index + 1, p.name);
            portConnectionTypes.set(index + 1, p.type as ConnectionType);
            portMacs.set(index + 1, MacAddress.validateAddress(p.mac, this.macDatabase)!);
            portIpv4s.set(index + 1, Ipv4Address.validateAddress(p.ip4 || '', this.ipv4Database)!);
            portIpv6s.set(index + 1, Ipv6Address.validateAddress(p.ip6 || '', this.ipv6Database)!);
        });

        switch (c.type) {
            //layer 1
            case 'repeater':
                component = new Repeater(c.color, portConnectionTypes, c.name);
                break;
            case 'hub':
                component = new Hub(c.color, c.ports.length, c.name);
                break;
            //layer 2
            case 'switch':
                component = new Switch(c.color, c.ports.length, portMacs, c.name);
                break;
            case 'bridge':
                component = new Bridge(c.color, portConnectionTypes, portMacs, c.name);
                break;
            case 'accesspoint':
                component = new AccessPoint(c.color, c.ports.length, portMacs, c.name);
                break;
            //layer 3
            case 'router':
                component = new Router(
                    c.color,
                    c.ports.length,
                    portNames,
                    portConnectionTypes,
                    portMacs,
                    portIpv4s,
                    portIpv6s,
                    c.name
                );
                break;
            //host
            case 'computer':
                component = new Host(
                    c.color,
                    iconToDataURI(biPcDisplayHorizontal),
                    c.ports.length,
                    portNames,
                    portConnectionTypes,
                    portMacs,
                    portIpv4s,
                    portIpv6s,
                    c.name
                );
                break;
            case 'mobile':
                component = new Host(
                    c.color,
                    iconToDataURI(biPhone),
                    c.ports.length,
                    portNames,
                    portConnectionTypes,
                    portMacs,
                    portIpv4s,
                    portIpv6s,
                    c.name
                );
                break;
        }

        component.id = c.id;
        console.log('component', component);

        if (component.layer >= 2) {
            c.ports
                .map((p: Port) => MacAddress.validateAddress(p.mac, this.macDatabase))
                .forEach((mac) => {
                    if (mac == null) return;
                    MacAddress.addAddressToDatabase(mac, this.macDatabase, component.id);
                });
        }
        if (component.layer >= 3) {
            c.ports
                .map((p: Port) => Ipv4Address.validateAddress(p.ip4 || '', this.ipv4Database))
                .forEach((ip4) => {
                    if (ip4 == null) return;
                    Ipv4Address.addAddressToDatabase(ip4, this.ipv4Database, component.id);
                });
            c.ports
                .map((p: Port) => Ipv6Address.validateAddress(p.ip6 || '', this.ipv6Database))
                .forEach((ip6) => {
                    if (ip6 == null) return;
                    Ipv6Address.addAddressToDatabase(ip6, this.ipv6Database, component.id);
                });
        }

        if (c.defaultGateway) {
            component.defaultGateway = c.defaultGateway;
        }

        this._graph.add({
            group: 'nodes',
            data: component,
            position: { x: c.x, y: c.y },
            classes: component.cssClass,
        });
    });

    connections.forEach((c) => {
        const to = this._graph.$id(c.to);
        const from = this._graph.$id(c.from);

        const edge = EdgeController.newUnconfiguredEdge(this, from.data(), to.data());
        edge.data.id = c.id;

        console.log('edge', edge, c);
        const addedEdge = this._graph.add(edge);

        if (c.inPort && c.outPort) {
            // const newData = GraphEdge.addPorts(addedEdge.data(), c.inPort, c.outPort);
            const newData = GraphEdge.addPorts(addedEdge.data(), c.inPort, c.outPort);

            if (newData != null) {
                addedEdge.removeClass('unconfigured-edge');
                addedEdge.addClass(newData.cssClass);
            } //set new format-display for this connection if no error appears

            this.subnettingController.setUpGateway(
                this._graph.$('#' + from.id),
                this._graph.$('#' + to.id),
                c.inPort,
                this.ipv4Database
            );
            this.subnettingController.setUpGateway(
                this._graph.$('#' + to.id),
                this._graph.$('#' + from.id),
                c.outPort,
                this.ipv4Database
            );
        }
    });

    networks.forEach((n) => {
        console.log('network', n);

        let netid: string = n.address;
        let netmask: string = n.netmask;
        let bitmask: number = n.bitmask;

        let color: string = n.color;

        let newNet = Net.createNet(color, netid, netmask, bitmask, this.ipv4Database, this);
        let net: any;
        if (newNet != null) {
            newNet.id = n.id;
            net = this._graph.add({
                group: 'nodes',
                data: newNet,
                position: { x: n.x, y: n.y },
                classes: newNet.cssClass,
            });
        } else {
            return;
        }

        n.components.forEach((c) => {
            const component = this._graph.$id(c);
            component.move({
                parent: net.id(),
            });
            this.subnettingController.onDragInACompound(component, net, this.ipv4Database);
        });

        if (n.currentDefaultGateway) {
            const gateway = this._graph.$id(n.currentDefaultGateway);
            if (!gateway.data()) return;
            const connection = this.connections.find(
                (c) => c.to === n.currentDefaultGateway || c.from === n.currentDefaultGateway
            );
            if (!connection) return;
            const port = connection.from === n.currentDefaultGateway ? connection.inPort : connection.outPort;
            net.data('currentDefaultGateway', [n.currentDefaultGateway, port]);
        }
    });

    networks.forEach((n) => {
        const net = this._graph.$id(n.id);

        if (n.gateways.length > 0) {
            n.gateways.forEach((g) => {
                const gateway = this._graph.$id(g);
                if (!gateway.data()) return;

                const nets = gateway.data('nets') || [];
                nets.push(net.data());
                gateway.data('nets', nets); //add net to gateway node
                gateway.data('cssClass').push('gateway-node');
                gateway.toggleClass('gateway-node', true);

                const connection = this.connections.find(
                    (c) => (c.to === g && n.components.includes(c.from)) || (c.from === g && n.components.includes(c.to))
                );
                if (!connection) {
                    net.data('gateways').set(gateway.id(), null); // add gateway to the net, with undefined port
                    return;
                } else {
                    const port = connection.from === g ? connection.inPort : connection.outPort;
                    if (port === 0) return;
                    const connectedComponent = this._graph.$id(connection.to === g ? connection.from : connection.to);
                    console.log('gateway', n, connection, port);
                    net.data('gateways').set(gateway.id(), port); // add gateway to the net, with port
                    this.subnettingController.setUpGateway(gateway, connectedComponent, port, this.ipv4Database);
                }
            });
        }
    });
}

export function setupListeners(this: NetworkComponent) {
    console.log('setupListeners');

    this._graph.on('add', (event: EventObject) => {
        // console.log('add', event.target.data());

        if (this.mode === 'simulate' || this.suspendGraphSync) return;

        if (event.target.data() instanceof Packet || event.target.data() instanceof Frame) return;

        if (event.target.isNode() && event.target.data().constructor.name === '_Net') {
            handleNetworkAdd.bind(this)(event);
            return;
        }

        if (event.target.isNode() && event.target.data().name) {
            handleNodeAdd.bind(this)(event);
            return;
        }

        if (event.target.isEdge()) {
            handleEdgeAdd.bind(this)(event);
            return;
        }
    });

    this._graph.on('remove', (event: EventObject) => {
        if (this.mode === 'simulate' || this.suspendGraphSync) return;
        // console.log('remove', event);
        if (event.target.data() instanceof Packet || event.target.data() instanceof Frame) return;
        if (event.target.isNode() && event.target.data().constructor.name === '_Net') {
            handleNetworkRemove.bind(this)(event);
            return;
        }

        if (event.target.isNode() && event.target.data().name) {
            handleNodeRemove.bind(this)(event);
        }

        if (event.target.isEdge()) {
            handleEdgeRemove.bind(this)(event);
        }
    });

    this._graph.on('data', (event: EventObject) => {
        if (this.mode === 'simulate' || this.suspendGraphSync) return;
        // console.log('data', event.target.data());

        if (event.target.data() instanceof Packet || event.target.data() instanceof Frame) return;

        if (event.target.isNode() && event.target.data().constructor.name === '_Net') {
            handleNetworkDataChange.bind(this)(event);
            return;
        }

        if (event.target.isNode() && event.target.data().name) {
            handleNodeDataChange.bind(this)(event);
            return;
        }

        if (event.target.isEdge()) {
            handleEdgeDataChange.bind(this)(event);
            return;
        }
    });

    this._graph.on('move', (event: EventObject) => {
        if (this.mode === 'simulate' || this.suspendGraphSync) return;
        if (event.target.data() instanceof Packet || event.target.data() instanceof Frame) return;
        const data = event.target.data();

        this.networks.forEach((n) => {
            if (n.components.includes(data.id)) {
                n.components.splice(n.components.indexOf(data.id), 1);
            }
        });

        if (data.parent) {
            const netId = data.parent;
            const network = this.networks.find((n) => n.id === netId);
            if (network) {
                network.components.push(data.id);
            }
        }

        this.networks = [...this.networks];

        console.log('move', event.target.data());
    });

    this._graph.on('dragfree', (event: EventObject) => {
        if (this.mode === 'simulate' || this.suspendGraphSync) return;
        const target = event.target;
        const data = target.data();
        const position = target.position();

        if (target.isNode() && data.constructor.name === '_Net') {
            const network = this.networks.find((n) => n.id === data.id);

            if (!network) return;

            network.x = position.x;
            network.y = position.y;
            this.networks[this.networks.indexOf(network)] = network;
            this.networks = [...this.networks];
            return;
        }

        if (target.isNode() && data.name) {
            const component = this.components.find((c) => c.id === data.id);

            if (!component) return;

            component.x = position.x;
            component.y = position.y;
            this.components[this.components.indexOf(component)] = component;
            this.components = [...this.components];
            return;
        }
    });
}

function handleNodeAdd(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();
    const position = target.position();

    console.log('Add Node', target, data, position);

    let type = data.constructor.name.toLowerCase();
    if (type[0] === '_') type = type.slice(1);
    console.log('type', type);

    if (type === 'host') {
        type = data.backgroundPath === iconToDataURI(biPcDisplayHorizontal) ? 'computer' : 'mobile';
    }

    const portData: Map<string, Map<string, any>> = data.portData;
    const portLinksData: Map<string, string> = data.portLinkMapping;
    const ports: Port[] = [];
    const portLinks: string[] = [];

    portData.forEach((port, _) => {
        const p: Port = {
            name: port.get('Name') || 'port',
            type: port.get('Connection Type') || 'ethernet',
            mac: (port.get('MAC') as MacAddress)?.address || '00:00:00:00:00:00',
            ip4: (port.get('IPv4') as Ipv4Address)?.address,
            ip6: (port.get('IPv6') as Ipv6Address)?.address,
        };

        ports.push(p);
    });

    portLinksData.forEach((link, _) => {
        portLinks.push(link || '');
    });

    const c: Component = {
        id: data.id,
        name: data.name,
        color: data.color,
        type: type,
        x: position.x,
        y: position.y,

        ports: ports,
        portLinks: portLinks,
    };

    this.components.push(c);
    this.components = [...this.components];
}

function handleEdgeAdd(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    if (!data.from || !data.to) return;

    this.connections.push({
        id: data.id,
        from: data.source,
        to: data.target,
        inPort: 0,
        outPort: 0,
        color: data.color,
    });
    this.connections = [...this.connections];

    console.log('Add Edge', target, data);
}

function handleNetworkAdd(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();
    const position = target.position();

    this.networks.push({
        id: data.id,
        components: [],
        gateways: [],
        name: data.name,
        netmask: data.netmask,
        bitmask: data.bitmask,
        address: data.networkAddress?.address,
        color: data.color,
        x: position.x,
        y: position.y,
    });
    this.networks = [...this.networks];

    console.log('Add Network', target, data, position);
}

function handleNodeRemove(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    const c = this.components.find((c) => c.id === data.id);

    if (!c) return;

    this.components.splice(this.components.indexOf(c), 1);
    this.components = [...this.components];

    this.networks.forEach((n) => {
        if (n.components.includes(data.id)) {
            n.components.splice(n.components.indexOf(data.id), 1);
        }
    });
    this.networks = [...this.networks];
}

function handleEdgeRemove(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    const c = this.connections.find((c) => c.id === data.id);

    if (!c) return;

    this.connections.splice(this.connections.indexOf(c), 1);
    this.connections = [...this.connections];
}

function handleNetworkRemove(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    const c = this.networks.find((c) => c.id === data.id);

    if (!c) return;

    this.networks.splice(this.networks.indexOf(c), 1);
    this.networks = [...this.networks];

    this.networks.forEach((n) => {
        if (n.components.includes(data.id)) {
            n.components.splice(n.components.indexOf(data.id), 1);
        }
    });
    this.networks = [...this.networks];
}

function handleNodeDataChange(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    const nodeIndex = this.components.findIndex((c) => c.id === data.id);

    if (nodeIndex === -1) return;

    this.components[nodeIndex].name = data.name;
    this.components[nodeIndex].color = data.color;

    const portData: Map<string, Map<string, any>> = data.portData;
    const portLinksData: Map<string, string> = data.portLinkMapping;
    const ports: Port[] = [];
    const portLinks: string[] = [];

    portData.forEach((port, _) => {
        const p: Port = {
            name: port.get('Name') || 'port',
            type: port.get('Connection Type') || 'ethernet',
            mac: (port.get('MAC') as MacAddress)?.address || '00:00:00:00:00:00',
            ip4: (port.get('IPv4') as Ipv4Address)?.address,
            ip6: (port.get('IPv6') as Ipv6Address)?.address,
        };

        ports.push(p);
    });
    portLinksData.forEach((link, _) => {
        portLinks.push(link || '');
    });

    this.components[nodeIndex].ports = ports;
    this.components[nodeIndex].portLinks = portLinks;
    this.components[nodeIndex].defaultGateway = data.defaultGateway;

    this.components = [...this.components];

    console.log('Node Data Change', target, data);
}

function handleEdgeDataChange(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    const edgeIndex = this.connections.findIndex((c) => c.id === data.id);

    if (edgeIndex === -1) return;

    this.connections[edgeIndex].inPort = data.inPort;
    this.connections[edgeIndex].outPort = data.outPort;
    this.connections[edgeIndex].color = data.color;
    this.connections = [...this.connections];

    console.log('Edge Data Change', target, data);
}

function handleNetworkDataChange(this: NetworkComponent, event: EventObject) {
    const target = event.target;
    const data = target.data();

    console.log('Network Data Change', target, data);
    const networkIndex = this.networks.findIndex((c) => c.id === data.id);

    if (networkIndex === -1) return;

    this.networks[networkIndex].name = data.name;
    this.networks[networkIndex].color = data.color;
    this.networks[networkIndex].address = data.networkAddress?.address;
    this.networks[networkIndex].netmask = data.netmask;
    this.networks[networkIndex].bitmask = data.bitmask;

    let gateways: string[] = [];
    data.gateways.forEach((_v: any, k: any) => {
        gateways.push(k);
    });
    this.networks[networkIndex].gateways = gateways;
    this.networks[networkIndex].currentDefaultGateway = data.currentDefaultGateway
        ? data.currentDefaultGateway[0]
        : null;

    this.networks = [...this.networks];
}
