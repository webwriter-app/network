import { html, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import iconAccessPoint from '@tabler/icons/outline/access-point.svg';
import iconCloudCheck from '@tabler/icons/outline/cloud-check.svg';
import iconCloudPlus from '@tabler/icons/outline/cloud-plus.svg';
import iconCloudUpload from '@tabler/icons/outline/cloud-upload.svg';
import iconDeviceDesktop from '@tabler/icons/outline/device-desktop.svg';
import iconDeviceMobile from '@tabler/icons/outline/device-mobile.svg';
import iconPlus from '@tabler/icons/outline/plus.svg';
import iconRouter from '@tabler/icons/outline/router.svg';
import iconServer from '@tabler/icons/outline/server.svg';
import iconShare from '@tabler/icons/outline/share.svg';
import iconSwitchHorizontal from '@tabler/icons/outline/switch-horizontal.svg';
import iconTopologyBus from '@tabler/icons/outline/topology-bus.svg';
import iconTopologyFullHierarchy from '@tabler/icons/outline/topology-full-hierarchy.svg';
import iconTopologyStar3 from '@tabler/icons/outline/topology-star-3.svg';
import iconUser from '@tabler/icons/outline/user.svg';
import type { WwNetwork } from '../widgets/ww-network';

type Entry = { kind: string; label: string; icon: string; aria?: boolean };

/**
 * Renders the floating toolbox used in 'edit' mode.
 * Contains quick actions to add hosts, network devices, edges, and networks.
 */
export function toolboxTemplate(this: WwNetwork): TemplateResult {
    const entry = ({ kind, label, icon, aria }: Entry) => html`
        <sl-tooltip content=${label} placement="top">
            <sl-button
                circle
                class="toolbox__btn"
                aria-label=${ifDefined(aria ? label : undefined)}
                @click=${() => this.addNode(kind)}
            >
                <sl-icon src=${icon}></sl-icon>
            </sl-button>
        </sl-tooltip>
    `;
    return html`
        <div class="toolbox" style=${this.mode == 'edit' ? 'display: flex;' : 'display: none;'}>
            <sl-button
                size="large"
                circle
                class="toolbox__open"
                aria-label=${this.msg('Add')}
                @click=${() => this.renderRoot.querySelector('#toolboxButtons')?.classList.toggle('closed')}
            >
                <sl-icon src=${iconPlus}></sl-icon>
            </sl-button>

            <div class="toolbox__buttons closed" id="toolboxButtons">
                <div class="toolbox__buttongroup">
                    <sl-button circle class="toolbox__btn" ?disabled=${this.drawModeOn}> <sl-icon src=${iconUser}></sl-icon> </sl-button>
                    <div class="toolbox__subbuttons">
                        ${entry({ kind: 'computer', label: this.msg('Computer'), icon: iconDeviceDesktop })}
                        ${entry({ kind: 'mobile', label: this.msg('Mobile device'), icon: iconDeviceMobile })}
                    </div>
                </div>
                <div class="toolbox__buttongroup">
                    <sl-button circle class="toolbox__btn" ?disabled=${this.drawModeOn}> <sl-icon src=${iconServer}></sl-icon> </sl-button>
                    <div class="toolbox__subbuttons">
                        ${entry({ kind: 'router', label: this.msg('Router'), icon: iconRouter })}
                        ${entry({ kind: 'access-point', label: this.msg('Access point'), icon: iconAccessPoint })}
                        ${entry({ kind: 'repeater', label: this.msg('Repeater'), icon: iconServer })}
                        ${entry({ kind: 'hub', label: this.msg('Hub'), icon: iconTopologyStar3, aria: true })}
                        ${entry({ kind: 'bridge', label: this.msg('Bridge'), icon: iconTopologyBus, aria: true })}
                        ${entry({ kind: 'switch', label: this.msg('Switch'), icon: iconSwitchHorizontal, aria: true })}
                    </div>
                </div>
                <div class="toolbox__buttongroup">
                    <sl-tooltip content=${this.msg('Edge')} placement="left">
                        <sl-button
                            circle
                            class="toolbox__btn"
                            variant=${this.drawModeOn ? 'primary' : 'default'}
                            @click=${() => this.toggleDrawMode()}
                        >
                            <sl-icon src=${iconShare}></sl-icon>
                        </sl-button>
                    </sl-tooltip>
                </div>
                <div class="toolbox__buttongroup">
                    <sl-tooltip content=${this.msg('Network')} placement="bottom">
                        <sl-button circle class="toolbox__btn" ?disabled=${this.drawModeOn} @click=${() => this.addNode('net')}>
                            <sl-icon src=${iconTopologyFullHierarchy}></sl-icon>
                        </sl-button>
                    </sl-tooltip>

                    <div class="toolbox__subbuttons">
                        <sl-tooltip content=${this.msg('Network assignment')} placement="top">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                variant=${this.mutexDragAndDrop === 'subnetting' ? 'primary' : 'default'}
                                @click=${() => this.toggleDragAndDropSubnetting()}
                            >
                                <sl-icon src=${iconCloudPlus}></sl-icon>
                            </sl-button>
                        </sl-tooltip>
                        <sl-tooltip content=${this.msg('Gateway assignment')} placement="top">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                variant=${this.mutexDragAndDrop === 'gateway' ? 'primary' : 'default'}
                                @click=${() => this.toggleAssigningGateway()}
                            >
                                <sl-icon src=${iconCloudUpload}></sl-icon>
                            </sl-button>
                        </sl-tooltip>
                        <sl-tooltip content=${this.msg('Validate global address assignments')} placement="top">
                            <sl-button circle class="toolbox__btn" @click=${() => this.validateAllNets()}>
                                <sl-icon src=${iconCloudCheck}></sl-icon>
                            </sl-button>
                        </sl-tooltip>
                    </div>
                </div>
            </div>
        </div>
    `;
}
