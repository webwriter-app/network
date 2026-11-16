import type { Diagram } from '../diagram';
import type { Data } from '../logical-nodes/data-node';

/** What the nodes of a simulation need from the one that carries packets and frames between them. */
export interface Courier {
    readonly diagram: Diagram;
    /** Puts a message at a node without sending it. */
    initMessage(sourceId: string, data: Data): void;
    /** Puts a message at a node and sends it on to a neighbour. */
    initThenDirectSend(sourceId: string, targetId: string, data: Data): void;
    /** Sends a message from a node over the link that leads to its receiver. */
    findNextHopThenSend(portIn: number | null, sourceId: string, data: Data): void;
    /** Moves a message from one node to a neighbour, which handles it when it arrives. */
    directSend(previousId: string, targetId: string, data: Data): void;
    /** Shows a message in a state class for a while, then removes it. */
    blinkingThenRemove(cssClass: string, data: Data): void;
}
