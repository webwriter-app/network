import { html } from 'lit';
import { NetworkComponent } from '../';
// import { SlPopup } from '@shoelace-style/shoelace';
// import SlButtonGroup from '@shoelace-style/shoelace/dist/components/button-group/button-group.component.js';
// import SlButton from '@shoelace-style/shoelace/dist/components/button/button.component.js';
// import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import { msg } from '@lit/localize';

export function simulationMenuTemplate(this: NetworkComponent) {
    const source = this._graph?.getElementById(this.packetSimulator.sourceEndPoint).data();
    const target = this._graph?.getElementById(this.packetSimulator.targetEndPoint).data();

    return html`
        <div class="simulationmenu" style=${this.mode === 'simulate' ? 'display: block;' : 'display: none;'}>
            <sl-button-group>
                <sl-button
                    class="set-source-btn"
                    @click=${(event: Event) => {
                        this.packetSimulator.setSource(event, this);
                    }}
                    size="small"
                    >${source ? source.id : msg('Set Source')}</sl-button
                >
                <sl-select
                    @sl-change=${(event: Event) => {
                        this.packetSimulator.sourceIp = (event.target as HTMLSelectElement).value;
                    }}
                    size="small"
                    value=${this.packetSimulator.sourceIp}
                >
                    ${source?.portData
                        ? Array.from(source?.portData)?.map((port: any) => {
                              return html`<sl-option value=${port[1].get('IPv4').address}
                                  >${port[1].get('IPv4').address}</sl-option
                              >`;
                          })
                        : null}
                </sl-select>
            </sl-button-group>
            <sl-button-group>
                <sl-button
                    class="set-target-btn"
                    @click=${(event: Event) => {
                        this.packetSimulator.setTarget(event, this);
                    }}
                    size="small"
                    >${target ? target.id : msg('Set Target')}</sl-button
                >
                <sl-select
                    @sl-change=${(event: Event) => {
                        this.packetSimulator.targetIp = (event.target as HTMLSelectElement).value;
                    }}
                    size="small"
                    value=${this.packetSimulator.targetIp}
                >
                    ${target?.portData
                        ? Array.from(target?.portData)?.map((port: any) => {
                              return html`<sl-option value=${port[1].get('IPv4').address}
                                  >${port[1].get('IPv4').address}</sl-option
                              >`;
                          })
                        : null}
                </sl-select>
            </sl-button-group>
            <sl-button-group>
                <sl-button @click=${startSimulation.bind(this)} size="small">${msg('Start Simulation')}</sl-button>
            </sl-button-group>
        </div>
    `;
}

function startSimulation(this: NetworkComponent) {
    console.log('start simulation');

    this.packetSimulator.startSession(this);
}
