import type { Diagram } from '../diagram';
import { Packet, Frame, Data } from '../logical-nodes/data-node';
import { PhysicalNode } from '../physical-nodes/physical-node';
import type { Courier } from './courier';

/** A node of a simulation: the host or connector it wraps, and what it does with the messages that reach it. */
export abstract class DataHandlingDecorator extends PhysicalNode {
    protected component: PhysicalNode;

    constructor(component: PhysicalNode) {
        super(component.color, component.layer, component.numberOfInterfacesOrPorts);
        this.component = component;
        this.portData = component.portData;
        this.backgroundPath = component.backgroundPath;
        this.name = component.name;
        this.portLinkMapping = component.portLinkMapping;
        this.defaultGateway = component.defaultGateway;
        this.id = component.id;
        this.cssClass = component.cssClass;
        this.cssClass.push('decorated-node');
        this.x = component.x;
        this.y = component.y;
        this.parent = component.parent;
    }

    get kind(): string {
        return this.component.kind;
    }

    handleDataIn(_data: Data, _previousId: string, _courier: Courier): void {
        return;
    }

    sendData(_data: Packet, _courier: Courier): void {
        return;
    }

    getPortIn(previousId: string, diagram: Diagram): number | null {
        let portIn: number | null = null;
        this.portLinkMapping.forEach((linkId, port) => {
            const edge = linkId ? diagram.edges.get(linkId) : undefined;
            if (!edge) return;
            if (edge.source == this.id && edge.target == previousId) {
                portIn = port;
            } else if (edge.target == this.id && edge.source == previousId) {
                portIn = port;
            }
        });
        return portIn;
    }

    flood(data: Data, previousId: string | null, port: number | null, courier: Courier): void {
        courier.diagram.removeNode(data.id);

        this.portLinkMapping.forEach((linkId, portIn) => {
            const edge = linkId ? courier.diagram.edges.get(linkId) : undefined;
            if (!edge) return;
            if (port == portIn || edge.target == previousId || edge.source == previousId) {
                //do not flood the incoming port
            } else {
                const directTargetId = edge.target == this.id ? edge.source : edge.target;
                const copy = data instanceof Packet ? Packet.cloneData(data) : Frame.cloneData(data as Frame);
                courier.initThenDirectSend(this.id, directTargetId, copy);
            }
        });
    }
}
