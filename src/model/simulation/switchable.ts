import type { Data } from '../logical-nodes/data-node';
import type { PhysicalNode } from '../physical-nodes/physical-node';
import type { Courier } from './courier';
import { DataHandlingDecorator } from './data-handling-decorator';

/** Switches, bridges and access points: they learn which port leads to which MAC address. */
export class SwitchableDecorator extends DataHandlingDecorator {
    macAddressTable: Map<string, number> = new Map(); //(mac, port)

    constructor(component: PhysicalNode) {
        super(component);
        this.cssClass.push('switchable-decorated');
    }

    learn(data: Data, previousId: string, courier: Courier): void {
        const senderMac: string = data.layer2header.macSender;

        if (this.macAddressTable.has(senderMac)) return;

        const port = this.getPortIn(previousId, courier.diagram);
        this.macAddressTable.set(senderMac, port!);
    }

    forward(data: Data, courier: Courier): boolean {
        const receiverMac = data.layer2header.macReceiver;
        if (this.macAddressTable.has(receiverMac)) {
            const edge = courier.diagram.edges.get(this.portLinkMapping.get(this.macAddressTable.get(receiverMac)!)!);
            if (!edge) return false;
            const nextHopId: string = edge.target == this.id ? edge.source : edge.target;
            courier.directSend(this.id, nextHopId, data);
            return true;
        }
        return false;
    }

    override handleDataIn(data: Data, previousId: string, courier: Courier): void {
        this.learn(data, previousId, courier);
        if (!this.forward(data, courier))
            this.flood(data, previousId, this.macAddressTable.get(data.layer2header.macSender) ?? null, courier);
    }
}
