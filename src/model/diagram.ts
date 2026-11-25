import { GraphEdge } from './graph-edge';
import { GraphNode } from './graph-node';
import type { Net, SubnettingMode } from './logical-nodes/net';
import type { Box } from './layout';
import { releaseNode } from './node-factory';
import { keepText, type Notify, type Translate } from './notice';
import type { PhysicalNode } from './physical-nodes/physical-node';

/** The nodes and edges of a network, with the address registries that keep them unique. */
export class Diagram {
    readonly nodes = new Map<string, GraphNode>();
    readonly edges = new Map<string, GraphEdge>();

    /** IPv4 address registry (address -> node id). */
    ipv4Database = new Map<string, string>();
    /** MAC address registry (address -> node id). Used to guarantee uniqueness. */
    macDatabase = new Map<string, string>();
    /** IPv6 address registry (address -> node id). */
    ipv6Database = new Map<string, string>();

    /** Where the view drew the frame of a net with content. Set by the widget; undefined while it is not drawn. */
    frameOf: (id: string) => Box | undefined = () => undefined;

    subnettingMode: SubnettingMode = 'MANUAL';
    /** Colour of the packets of a simulation. */
    currentColor = 'white';

    constructor(
        readonly msg: Translate = keepText,
        readonly notify: Notify = () => {}
    ) {}

    node<T extends GraphNode = GraphNode>(id: string | undefined | null): T | undefined {
        return id == null ? undefined : (this.nodes.get(id) as T | undefined);
    }

    /** Hosts and connectors, also while a simulation has decorated them. */
    physicalNodes(): PhysicalNode[] {
        return [...this.nodes.values()].filter((node) => node.has('physical-node')) as PhysicalNode[];
    }

    nets(): Net[] {
        return [...this.nodes.values()].filter((node) => node.has('net-node')) as Net[];
    }

    childrenOf(id: string): GraphNode[] {
        return [...this.nodes.values()].filter((node) => node.parent === id);
    }

    edgesOf(id: string): GraphEdge[] {
        return [...this.edges.values()].filter((edge) => edge.source === id || edge.target === id);
    }

    /** The net a node sits in. */
    netOf(id: string): Net | undefined {
        return this.node<Net>(this.node(id)?.parent);
    }

    add(node: GraphNode, x?: number, y?: number): void {
        if (x !== undefined) node.x = x;
        if (y !== undefined) node.y = y;
        this.nodes.set(node.id, node);
    }

    addEdge(edge: GraphEdge): void {
        this.edges.set(edge.id, edge);
    }

    /** Removes a node with what hangs on it: its edges, and the content of a net. */
    removeNode(id: string): void {
        const node = this.nodes.get(id);
        if (!node) return;
        // A net that loses its last content stays where that content was.
        const parent = this.node<Net>(node.parent);
        if (parent && this.childrenOf(parent.id).length === 1) {
            const box = this.frameOf(parent.id);
            if (box) {
                parent.x = box.x + box.width / 2;
                parent.y = box.y + box.height / 2;
            }
        }
        for (const child of this.childrenOf(id)) this.removeNode(child.id);
        for (const edge of this.edgesOf(id)) this.removeEdge(edge.id);
        releaseNode(this, node);
        this.nodes.delete(id);
    }

    removeEdge(id: string): void {
        const edge = this.edges.get(id);
        if (!edge) return;
        for (const [end, port] of [[edge.source, edge.inPort], [edge.target, edge.outPort]] as const) {
            if (port == undefined || port == null || Number.isNaN(port)) continue;
            this.node<PhysicalNode>(end)?.portLinkMapping.set(port, null!);
        }
        this.edges.delete(id);
    }

    /** Whether an edge may be drawn from one node to another. Otherwise the reason. */
    canConnect(sourceId: string, targetId: string): true | string {
        const source = this.node<PhysicalNode>(sourceId);
        const target = this.node<PhysicalNode>(targetId);
        if (!source || !target || !source.has('physical-node') || !target.has('physical-node')) return '';
        if (source === target) return '';
        if (this.edgesOf(sourceId).some((edge) => edge.source === targetId || edge.target === targetId)) return '';
        if (this.edgesOf(sourceId).length >= source.numberOfInterfacesOrPorts) {
            return source.name + ' ' + this.msg('is out of available ports.');
        }
        if (this.edgesOf(targetId).length >= target.numberOfInterfacesOrPorts) {
            return target.name + ' ' + this.msg('is out of available ports.');
        }
        return true;
    }

    connect(sourceId: string, targetId: string): GraphEdge | undefined {
        const source = this.node<PhysicalNode>(sourceId);
        const target = this.node<PhysicalNode>(targetId);
        if (!source || !target) return undefined;
        const edge = new GraphEdge('#70e6af', source, target);
        this.addEdge(edge);
        return edge;
    }
}
