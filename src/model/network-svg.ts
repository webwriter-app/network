import type { Diagram } from './diagram';
import { NODE_SIZE, netBoxOf, type Box } from './layout';
import type { Net } from './logical-nodes/net';
import type { PhysicalNode } from './physical-nodes/physical-node';

const NET_PADDING = 18;
const MARGIN = 30;
const NAME_GAP = 12;

const escapeXml = (text: string) =>
    text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

/** The box of a net: as the view draws it, otherwise the box around what it holds. */
function netBox(diagram: Diagram, net: Net): Box {
    const drawn = netBoxOf(diagram, net);
    if (drawn) return drawn;
    const boxes: Box[] = diagram.childrenOf(net.id).map((child) =>
        child.has('net-node')
            ? netBox(diagram, child as Net)
            : { x: child.x - NODE_SIZE / 2, y: child.y - NODE_SIZE / 2, width: NODE_SIZE, height: NODE_SIZE + NAME_GAP }
    );
    const left = Math.min(...boxes.map((box) => box.x)) - NET_PADDING;
    const top = Math.min(...boxes.map((box) => box.y)) - NET_PADDING;
    const right = Math.max(...boxes.map((box) => box.x + box.width)) + NET_PADDING;
    const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + NET_PADDING;
    return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The depth of a net inside other nets, so that outer nets are painted first. */
function depth(diagram: Diagram, net: Net): number {
    let level = 0;
    for (let up = diagram.node<Net>(net.parent); up; up = diagram.node<Net>(up.parent)) level++;
    return level;
}

/** The diagram as a standalone SVG picture: nets, connections, and hosts and connectors with their names. */
export function diagramToSvg(diagram: Diagram): string {
    const nets = diagram.nets().sort((a, b) => depth(diagram, a) - depth(diagram, b));
    const physical = diagram.physicalNodes();
    const netBoxes = new Map(nets.map((net) => [net.id, netBox(diagram, net)]));

    const boxes: Box[] = [
        ...netBoxes.values(),
        ...physical.map((node) => ({ x: node.x - NODE_SIZE / 2, y: node.y - NODE_SIZE / 2, width: NODE_SIZE, height: NODE_SIZE + NAME_GAP + 4 })),
    ];
    if (boxes.length === 0) boxes.push({ x: 0, y: 0, width: 100, height: 60 });
    const left = Math.min(...boxes.map((box) => box.x)) - MARGIN;
    const top = Math.min(...boxes.map((box) => box.y)) - MARGIN;
    const width = Math.max(...boxes.map((box) => box.x + box.width)) + MARGIN - left;
    const height = Math.max(...boxes.map((box) => box.y + box.height)) + MARGIN - top;

    const parts: string[] = [];
    for (const net of nets) {
        const box = netBoxes.get(net.id)!;
        const label = net.has('unconfigured-net') ? diagram.msg('Unconfigured') : net.name;
        parts.push(
            `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="4" fill="${escapeXml(net.color)}" fill-opacity="0.4" stroke="${escapeXml(net.color)}"/>`,
            `<text x="${box.x + 4}" y="${box.y + 11}" font-size="10">${escapeXml(label ?? '')}</text>`
        );
    }
    for (const edge of diagram.edges.values()) {
        const from = diagram.node(edge.source);
        const to = diagram.node(edge.target);
        if (!from || !to) continue;
        parts.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${escapeXml(edge.color)}" stroke-width="2"/>`);
    }
    for (const node of physical as PhysicalNode[]) {
        const x = node.x - NODE_SIZE / 2;
        const y = node.y - NODE_SIZE / 2;
        parts.push(
            `<rect x="${x}" y="${y}" width="${NODE_SIZE}" height="${NODE_SIZE}" rx="5" fill="${escapeXml(node.color)}" stroke="#333"/>`,
            `<image x="${x + 2}" y="${y + 2}" width="${NODE_SIZE - 4}" height="${NODE_SIZE - 4}" href="${escapeXml(node.backgroundPath ?? '')}"/>`,
            `<text x="${node.x}" y="${y + NODE_SIZE + NAME_GAP}" font-size="10" text-anchor="middle">${escapeXml(node.name ?? '')}</text>`
        );
    }

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${Math.ceil(width)}" height="${Math.ceil(height)}" font-family="sans-serif">` +
        `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#fff"/>` +
        parts.join('') +
        '</svg>'
    );
}
