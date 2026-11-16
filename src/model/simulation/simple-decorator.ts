import type { Data } from '../logical-nodes/data-node';
import { Packet, Frame } from '../logical-nodes/data-node';
import type { PhysicalNode } from '../physical-nodes/physical-node';
import type { Courier } from './courier';
import { DataHandlingDecorator } from './data-handling-decorator';

/** Repeaters and hubs: every message goes out of every other port. */
export class SimpleDecorator extends DataHandlingDecorator {
    constructor(component: PhysicalNode) {
        super(component);
        this.cssClass.push('simple-decorated');
    }

    override handleDataIn(data: Data, previousId: string, courier: Courier): void {
        courier.diagram.removeNode(data.id);

        this.portLinkMapping.forEach((linkId) => {
            const edge = linkId ? courier.diagram.edges.get(linkId) : undefined;
            if (!edge) return;
            if (edge.target == previousId || edge.source == previousId) {
                //do not flood the incoming port
            } else {
                const directTargetId = edge.target == this.id ? edge.source : edge.target;
                const copy = data instanceof Packet ? Packet.cloneData(data) : Frame.cloneData(data as Frame);
                courier.initThenDirectSend(this.id, directTargetId, copy);
            }
        });
    }
}
