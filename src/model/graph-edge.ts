import type { Diagram } from './diagram';
import { Address } from './addressing/address';
import { PhysicalNode } from './physical-nodes/physical-node';

export class GraphEdge {
    id: string;
    color: string;
    cssClass: string[] = [];
    from: PhysicalNode;
    to: PhysicalNode;
    inPort?: number;
    outPort?: number;
    source: string;
    target: string;

    constructor(color: string, from: PhysicalNode, to: PhysicalNode, id?: string) {
        if (id != null && id != undefined && id != '') {
            this.id = id;
        } else {
            this.id = 'graphEdge' + crypto.randomUUID();
        }

        this.color = color;
        this.cssClass.push('color-edge');
        this.cssClass.push('unconfigured-edge');
        this.from = from;
        this.to = to;
        this.source = this.from.id;
        this.target = this.to.id;
    }

    has(cssClass: string): boolean {
        return this.cssClass.includes(cssClass);
    }

    get configured(): boolean {
        return !this.has('unconfigured-edge');
    }

    /**
     * Links the edge to one port of each end. Returns null, after telling the user why, when the ports
     * do not exist or their connection types do not fit.
     */
    static addPorts(edge: GraphEdge, inPort: number, outPort: number, diagram: Diagram): GraphEdge | null {
        const inPortData: Map<string, any> | undefined = edge.from.portData.get(inPort);
        const outPortData: Map<string, any> | undefined = edge.to.portData.get(outPort);

        if (inPortData == undefined || outPortData == undefined) return null;

        const inType = inPortData.get('Connection Type');
        const outType = outPortData.get('Connection Type');
        if (inType != outType && (inType == 'wireless' || outType == 'wireless')) {
            diagram.notify(
                'danger',
                diagram.msg('The connection type of assigned ports are not compatible!'),
                diagram.msg('Please re-assign your ports or dismiss this connection.')
            );
            return null;
        }

        for (const cssClass of ['wireless-edge', 'wired-edge', 'labelled-edge', 'unconfigured-edge']) {
            edge.cssClass = edge.cssClass.filter((other) => other != cssClass);
        }
        edge.cssClass.push(inType == 'wireless' && outType == 'wireless' ? 'wireless-edge' : 'wired-edge');
        edge.cssClass.push('labelled-edge');

        // A port that this edge used before is free again.
        for (const end of [edge.from, edge.to]) {
            end.portLinkMapping.forEach((link, port) => {
                if (link == edge.id) end.portLinkMapping.set(port, '');
            });
        }
        edge.from.portLinkMapping.set(inPort, edge.id);
        edge.to.portLinkMapping.set(outPort, edge.id);

        edge.inPort = inPort;
        edge.outPort = outPort;

        return edge;
    }
}

/** The lines of text an edge shows at one of its ends: what the port at that end is called and which addresses it has. */
export function portLabel(node: PhysicalNode, port: number | undefined): string {
    const portData: Map<string, any> | undefined = port === undefined ? undefined : node.portData.get(port);
    if (portData == undefined) return '';
    let label = '';
    //TOEXTEND:hide IPv6 since the widget doesn't support IPv6 atm
    portData.forEach((value, key) => {
        if (key == 'Connection Type' || key == 'IPv6') return;
        label += (value instanceof Address ? key + ': ' + value.address : value) + '\n';
    });
    return label.trimEnd();
}
