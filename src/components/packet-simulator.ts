import type { Diagram } from '../model/diagram';
import { Data, Packet } from '../model/logical-nodes/data-node';
import type { PhysicalNode } from '../model/physical-nodes/physical-node';
import { decorateNodes, discoverRoutes } from '../model/simulation/decorate';
import type { Courier } from '../model/simulation/courier';
import { DataHandlingDecorator } from '../model/simulation/data-handling-decorator';
import { RoutableDecorator } from '../model/simulation/routable';
import { SimpleDecorator } from '../model/simulation/simple-decorator';
import { SwitchableDecorator } from '../model/simulation/switchable';
import { validateAllNets } from '../model/subnetting';
import { MoveAnimation } from './packet-animation';

export type SimulationHost = { readonly diagram: Diagram; requestUpdate(): void };

/** How long a packet takes from one node to the next, and how long it shows each state of a blink. */
const TRAVEL_TIME = 2000;
const BLINK_STEP = 400;

/** Runs the packet simulation: sends messages between the nodes of the diagram, and keeps them moving. */
export class PacketSimulator implements Courier {
    sourceEndPoint: string = '';
    targetEndPoint: string = '';
    sourceIp: string = '127.0.0.1';
    targetIp: string = '127.0.0.1';

    inited: boolean = false;

    #animations = new Set<MoveAnimation>();
    #timers = new Set<number>();

    constructor(private readonly host: SimulationHost) {}

    get diagram(): Diagram {
        return this.host.diagram;
    }

    /** Takes the node the user chose as sender or receiver. Returns false, after telling the user, if it cannot be one. */
    pickEndPoint(role: 'source' | 'target', nodeId: string): boolean {
        const node = this.diagram.node(nodeId);
        if (!(node instanceof DataHandlingDecorator) || node.layer < 3) {
            this.diagram.notify(
                'warning',
                '',
                this.diagram.msg('Currently the widget only supports host as sender and receiver.')
            );
            return false;
        }

        const address = node.portData.get(1)?.get('IPv4')?.address;
        if (role === 'source') {
            this.sourceEndPoint = nodeId;
            this.sourceIp = address;
        } else {
            this.targetEndPoint = nodeId;
            this.targetIp = address;
        }
        return true;
    }

    startSession(): void {
        const diagram = this.diagram;
        if (!this.inited) {
            diagram.notify('danger', '', diagram.msg('Please Init a session before simulating sending a packet.'));
            return;
        }
        if (diagram.physicalNodes().some((node) => !(node instanceof DataHandlingDecorator))) {
            //check graph again
            if (!validateAllNets(diagram, true)) {
                diagram.notify(
                    'danger',
                    diagram.msg('Your graph is not qualified for this feature:'),
                    diagram.msg('Please use the Check button of the Subnetting/CIDR feature for more details')
                );
                return;
            }
            decorateNodes(diagram);
        }
        if (this.sourceEndPoint == '' || this.targetEndPoint == '') {
            diagram.notify(
                'danger',
                '',
                diagram.msg('The sender or receiver is not selected yet, use the Choose sender/receiver button then click on the graph node.')
            );
            return;
        }

        const source = diagram.node<RoutableDecorator>(this.sourceEndPoint);
        const target = diagram.node<PhysicalNode>(this.targetEndPoint);
        if (!source || !target) return;

        if (source.layer < 3 || target.layer < 3) {
            diagram.notify(
                'warning',
                '',
                diagram.msg('The widget currently only support sending Parcel between layer 3 components')
            );
        }

        if (this.sourceIp == '127.0.0.1' || this.targetIp == '127.0.0.1') {
            diagram.notify('success', '', diagram.msg('Your packet finished sending with the loop-back address.'));
            return;
        }

        //create data packet
        const data: Packet = new Packet(diagram.currentColor, '', '', this.sourceIp, this.targetIp);
        this.initMessage(source.id, data);
        source.sendData(data, this);
    }

    initSession(): void {
        const diagram = this.diagram;
        if (!validateAllNets(diagram, true)) {
            diagram.notify(
                'danger',
                diagram.msg('Your graph is not qualified for this feature:'),
                diagram.msg('Please use the Check button of the Subnetting/CIDR feature for more details')
            );
            return;
        }

        decorateNodes(diagram);
        discoverRoutes(this);

        this.inited = true;
        this.host.requestUpdate();
    }

    initMessage(sourceId: string, data: Data): void {
        const source = this.diagram.node(sourceId);
        this.diagram.add(data, source?.x ?? 0, (source?.y ?? 0) - 20);
        this.host.requestUpdate();
    }

    initThenDirectSend(sourceId: string, targetId: string, data: Data): void {
        this.initMessage(sourceId, data);
        this.directSend(sourceId, targetId, data);
    }

    findNextHopThenSend(portIn: number | null, sourceId: string, data: Data): void {
        const diagram = this.diagram;
        const source = diagram.node<PhysicalNode>(sourceId);
        const macReceiver: string = data.layer2header.macReceiver;

        let port: number | undefined;
        if (source instanceof SwitchableDecorator) {
            port = source.macAddressTable.get(macReceiver);
        } else if (source instanceof RoutableDecorator) {
            port = source.findPortToSend(source.arpTableMacIp.get(macReceiver)!);
        } else if (source instanceof SimpleDecorator) {
            source.flood(data, null, portIn, this);
            return;
        }
        const link = diagram.edges.get(source?.portLinkMapping.get(port!)!);
        if (!source || !link) return;
        this.directSend(sourceId, link.source == source.id ? link.target : link.source, data);
    }

    directSend(previousId: string, targetId: string, data: Data): void {
        const target = this.diagram.node(targetId);
        if (!target) return;

        const animation = new MoveAnimation(data, { x: target.x, y: target.y - 20 }, TRAVEL_TIME, () => this.host.requestUpdate());
        this.#animations.add(animation);

        animation
            .play()
            .finished.then(() => {
                this.#animations.delete(animation);
                if (target instanceof DataHandlingDecorator) target.handleDataIn(data, previousId, this);
            });
    }

    blinkingThenRemove(cssClass: string, data: Data): void {
        const steps = [false, true, false, true, false, true];
        steps.forEach((on, index) => {
            this.#later((index + 1) * BLINK_STEP, () => {
                data.setClass(cssClass, on);
                this.host.requestUpdate();
            });
        });
        this.#later((steps.length + 1) * BLINK_STEP, () => {
            this.diagram.removeNode(data.id);
            this.host.requestUpdate();
        });
    }

    #later(delay: number, action: () => void): void {
        const timer = window.setTimeout(() => {
            this.#timers.delete(timer);
            action();
        }, delay);
        this.#timers.add(timer);
    }

    stopSession(): void {
        const diagram = this.diagram;
        for (const node of diagram.physicalNodes()) {
            if (node instanceof SwitchableDecorator) node.macAddressTable = new Map();
            if (node instanceof RoutableDecorator) {
                node.routingTable = new Map();
                node.arpTableIpMac = new Map();
                node.arpTableMacIp = new Map();
            }
        }

        //stop all animations and remove related packet/frame nodes
        this.#animations.forEach((animation) => animation.stop());
        this.#animations.clear();
        this.#timers.forEach((timer) => clearTimeout(timer));
        this.#timers.clear();
        for (const node of [...diagram.nodes.values()]) if (node.has('data-node')) diagram.removeNode(node.id);

        this.inited = false;
        this.host.requestUpdate();
    }
}
