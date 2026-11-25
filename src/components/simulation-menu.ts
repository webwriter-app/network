import { html } from 'lit';
import type { PhysicalNode } from '../model/physical-nodes/physical-node';
import type { WwNetwork } from '../widgets/ww-network';

function endPointTemplate(
    this: WwNetwork,
    role: 'source' | 'target',
    node: PhysicalNode | undefined,
    other: 'source' | 'target' | null
) {
    const simulator = this.packetSimulator;
    const label = role === 'source' ? this.msg('Set Source') : this.msg('Set Target');
    const ip = role === 'source' ? simulator.sourceIp : simulator.targetIp;
    return html`
        <sl-button-group>
            <sl-button
                class=${role === 'source' ? 'set-source-btn' : 'set-target-btn'}
                size="small"
                ?loading=${this.picking === role}
                ?disabled=${this.picking === other}
                @click=${() => this.pickEndPoint(role)}
                >${node ? node.id : label}</sl-button
            >
            <sl-select
                size="small"
                label=${role === 'source' ? this.msg('Source address') : this.msg('Target address')}
                value=${ip}
                @sl-change=${(event: Event) => {
                    const value = (event.target as HTMLSelectElement).value;
                    if (role === 'source') simulator.sourceIp = value;
                    else simulator.targetIp = value;
                }}
            >
                ${node?.portData
                    ? Array.from(node.portData).map(
                          ([, port]) =>
                              html`<sl-option value=${port.get('IPv4').address}>${port.get('IPv4').address}</sl-option>`
                      )
                    : null}
            </sl-select>
        </sl-button-group>
    `;
}

/** Renders the menu of the simulation: sender, receiver and the start button. */
export function simulationMenuTemplate(this: WwNetwork) {
    const simulator = this.packetSimulator;
    const source = this.diagram.node<PhysicalNode>(simulator.sourceEndPoint);
    const target = this.diagram.node<PhysicalNode>(simulator.targetEndPoint);

    return html`
        <div class="simulationmenu" style=${this.mode === 'simulate' ? 'display: block;' : 'display: none;'}>
            ${endPointTemplate.call(this, 'source', source, this.picking === 'target' ? 'target' : null)}
            ${endPointTemplate.call(this, 'target', target, this.picking === 'source' ? 'source' : null)}
            <sl-button-group>
                <sl-button @click=${() => simulator.startSession()} size="small">${this.msg('Start Simulation')}</sl-button>
            </sl-button-group>
        </div>
    `;
}
