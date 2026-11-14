import type { MsgFn } from "@lit/localize";
import { sourceMsg } from "../../localization/localizer";
import { AlertHelper } from '../utils/AlertHelper';
import { PhysicalNode } from './physicalNodes/PhysicalNode';

export class GraphEdge {
    id: string;
    color: string;
    cssClass: string[] = [];
    from: PhysicalNode;
    to: PhysicalNode;
    inPort!: number;
    outPort!: number;
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
        this.cssClass.push('deletable');
        this.from = from;
        this.to = to;
        this.source = this.from.id;
        this.target = this.to.id;
    }

    static addPorts(edge: GraphEdge, inPort: number, outPort: number, msg: MsgFn = sourceMsg): GraphEdge | null {
        let inPortData: Map<string, any> | undefined = edge.from.portData.get(inPort);
        let outPortData: Map<string, any> | undefined = edge.to.portData.get(outPort);

        if (inPortData == undefined || outPortData == undefined) return null;

        console.log('Add ports: ', edge, inPort, outPort, inPortData, outPortData);

        if (inPortData.get('Connection Type') == 'wireless' && outPortData.get('Connection Type') == 'wireless') {
            edge.cssClass.push('wireless-edge');
        } else if (
            (inPortData.get('Connection Type') == 'wireless' && outPortData.get('Connection Type') == 'ethernet') ||
            (inPortData.get('Connection Type') == 'ethernet' && outPortData.get('Connection Type') == 'wireless')
        ) {
            AlertHelper.toastAlert(
                'danger',
                'exclamation-triangle',
                msg('The connection type of assigned ports are not compatible!'),
                msg('Please re-assign your ports or dismiss this connection.')
            );
            return null;
        } else {
            edge.cssClass.push('wired-edge');
        }

        edge.cssClass.push('labelled-edge');

        let index;
        if ((index = edge.cssClass.indexOf('unconfigured-edge')) > -1) edge.cssClass.splice(index, 1);

        edge.from.portLinkMapping.set(inPort, edge.id);
        edge.to.portLinkMapping.set(outPort, edge.id);

        edge.inPort = inPort;
        edge.outPort = outPort;

        return edge;

        //check if one node belongs to a net, if yes --> other node must be a router
    }
}
