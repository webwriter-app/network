import type { Diagram } from './diagram';
import type { GraphNode } from './graph-node';
import type { Net } from './logical-nodes/net';

export type Box = { x: number; y: number; width: number; height: number };

/** Size of the picture of a host or connector. */
export const NODE_SIZE = 20;
const EMPTY_NET = 50;

/** The box of a net without content, at its own position. A net with content is as big as its group is drawn. */
export function emptyNetBox(net: Net): Box {
    return { x: net.x - EMPTY_NET / 2, y: net.y - EMPTY_NET / 2, width: EMPTY_NET, height: EMPTY_NET };
}

/** The box of a net as it is drawn: the frame of its group, or the small box of an empty net. */
export function netBoxOf(diagram: Diagram, net: Net): Box | undefined {
    return diagram.childrenOf(net.id).length === 0 ? emptyNetBox(net) : diagram.frameOf(net.id);
}

/** Moves a node, and what is inside it if it is a net. */
export function moveNode(diagram: Diagram, node: GraphNode, dx: number, dy: number): void {
    node.x += dx;
    node.y += dy;
    if (node.has('net-node')) for (const child of diagram.childrenOf(node.id)) moveNode(diagram, child, dx, dy);
}

export function contains(box: Box, x: number, y: number, margin = 0): boolean {
    return x >= box.x - margin && x <= box.x + box.width + margin && y >= box.y - margin && y <= box.y + box.height + margin;
}

/** Distance from a node to the label of its port, along the edge. */
const PORT_LABEL_OFFSET = 80;

/** How far from its node the label of a port sits on the edge between two nodes. */
export function portLabelReach(from: GraphNode, to: GraphNode): number {
    return Math.min(PORT_LABEL_OFFSET, Math.hypot(to.x - from.x, to.y - from.y) / 2);
}
