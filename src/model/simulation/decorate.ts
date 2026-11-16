import type { Diagram } from '../diagram';
import type { Courier } from './courier';
import type { Net } from '../logical-nodes/net';
import { RoutingData } from '../routing-data';
import { DataHandlingDecorator } from './data-handling-decorator';
import { RoutableDecorator } from './routable';
import { SimpleDecorator } from './simple-decorator';
import { SwitchableDecorator } from './switchable';

/** Wraps every host and connector that is not wrapped yet in the node that handles messages for it. */
export function decorateNodes(diagram: Diagram): void {
    for (const node of diagram.physicalNodes()) {
        if (node instanceof DataHandlingDecorator) continue;
        let decorated: DataHandlingDecorator;
        if (node.has('host-node') || node.has('router-node')) {
            decorated = new RoutableDecorator(node);
        } else if (node.has('switch-node') || node.has('bridge-node') || node.has('access-point-node')) {
            decorated = new SwitchableDecorator(node);
        } else {
            decorated = new SimpleDecorator(node);
        }
        diagram.nodes.set(node.id, decorated);
    }
}

/** What a router learns before any packet is sent: which nets it reaches, and through which neighbour. */
export function discoverRoutes(courier: Courier): void {
    const diagram = courier.diagram;
    diagram.physicalNodes().filter((node) => node.has('gateway-node')).forEach((node) => {
        const router = node as RoutableDecorator;
        const routingData: { address: string; nextHop: string; bitmask: number; interfaceName: string; port: number }[] = [];

        const exploreNet = (net: Net, outPort: number) => {
            net.gateways.forEach((port, gatewayId) => {
                const gatewayData = diagram.node<RoutableDecorator>(gatewayId);
                gatewayData?.portNetMapping?.forEach((other) => {
                    if (!other?.networkAddress) return;
                    if (routingData.find((data) => data.address == other.networkAddress.address) == undefined) {
                        routingData.push({
                            address: other.networkAddress.address,
                            nextHop: gatewayData.portData.get(port)!.get('IPv4').address,
                            bitmask: other.bitmask,
                            interfaceName: gatewayData.portData.get(port)!.get('Name'),
                            port: outPort,
                        });
                        exploreNet(other, port);
                    }
                });
            });
        };

        router.portNetMapping?.forEach((net, key) => {
            if (!net?.networkAddress) return;
            routingData.push({
                address: net.networkAddress.address,
                nextHop: 'on-link',
                bitmask: net.bitmask,
                interfaceName: router.portData.get(key)!.get('Name'),
                port: key,
            });

            exploreNet(net, key);
        });

        routingData.forEach((data) => {
            router.routingTable.set(
                data.address,
                new RoutingData(data.address, data.nextHop, data.bitmask, data.interfaceName, data.port)
            );
        });
    });
}
