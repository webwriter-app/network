import { SlIcon } from '@shoelace-style/shoelace';
import { NodeSingular } from 'cytoscape';
import { NetworkComponent } from '..';
import { GraphEdge } from '../components/GraphEdge';
import { PhysicalNode } from '../components/physicalNodes/PhysicalNode';
import { AlertHelper } from '../utils/AlertHelper';
import { msg } from '@lit/localize';

export class EdgeController {
    static toggleDrawMode(network: NetworkComponent): void {
        const drawModeIcon = network.renderRoot.querySelector('#drawMode') as SlIcon | null;
        const drawButton = network.renderRoot.querySelector('#drawBtn') as HTMLElement | null;
        const resetColorButton = network.renderRoot.querySelector('#resetColorBtn') as HTMLButtonElement | null;

        if (!network.drawModeOn) {
            // if (network.currentComponentToAdd != "edge") {
            //     return;
            // }
            network._edgeHandles.enableDrawMode();
            if (drawModeIcon) drawModeIcon.name = 'pause';
            if (drawButton) drawButton.style.backgroundColor = '#0291DB';
            if (resetColorButton) resetColorButton.disabled = true;
        } else {
            network._edgeHandles.disableDrawMode();
            if (drawModeIcon) drawModeIcon.name = 'plug';
            if (drawButton) drawButton.style.backgroundColor = '#8BA8CC';
            if (resetColorButton) resetColorButton.disabled = false;
        }
        network.drawModeOn = !network.drawModeOn;
        network.requestUpdate();
    }

    static canConnect(source: NodeSingular, target: NodeSingular): boolean {
        //disallow loop & duplicate edge
        if (source.same(target) || source.allAreNeighbors(target)) {
            return false;
        }

        let sourceNode = source.data();
        let targetNode = target.data();
        let sourceCheck: boolean = source.hasClass('physical-node');
        let targetCheck: boolean = target.hasClass('physical-node');

        if (!sourceCheck || !targetCheck) return false;

        //the edgehandles extensions use a ghost edge, that increases the degree by 1 from the source
        if (source.degree() > sourceNode.numberOfInterfacesOrPorts) {
            AlertHelper.toastAlert(
                'warning',
                'exclamation-triangle',
                sourceNode.name + ' ' + msg('is out of available ports.'),
                ''
            );
            return false;
        }
        if (target.degree() >= targetNode.numberOfInterfacesOrPorts) {
            AlertHelper.toastAlert(
                'warning',
                'exclamation-triangle',
                targetNode.name + ' ' + msg('is out of available ports.'),
                ''
            );
            return false;
        }

        return true;
    }

    static newUnconfiguredEdge(_network: NetworkComponent, source: PhysicalNode, target: PhysicalNode): any {
        let unconfiguredEdge = new GraphEdge('#70e6af', source, target);
        return { group: 'edges', data: unconfiguredEdge, classes: unconfiguredEdge.cssClass };
    }

    static removeConnection(edge: GraphEdge, graph: any) {
        if (edge.inPort != undefined && edge.inPort != null && !Number.isNaN(edge.inPort)) {
            if (graph.$('#' + edge.from.id).data() instanceof PhysicalNode)
                graph
                    .$('#' + edge.from.id)
                    .data()
                    .portLinkMapping.set(edge.inPort, null);
        }
        if (edge.outPort != undefined && edge.outPort != null && !Number.isNaN(edge.outPort)) {
            if (graph.$('#' + edge.to.id).data() instanceof PhysicalNode)
                graph
                    .$('#' + edge.to.id)
                    .data()
                    .portLinkMapping.set(edge.outPort, null);
        }
    }
}
