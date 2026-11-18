import { html, type TemplateResult } from 'lit';
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

type Entry = { kind: string; label: string; icon: string };

/**
 * Renders the floating toolbox used in 'edit' mode.
 * Contains quick actions to add hosts, network devices, edges, and networks.
 */
export function toolboxTemplate(this: WwNetwork): TemplateResult {
    const group = (name: string) => (this.toolboxGroup === name ? 'toolbox__buttongroup open' : 'toolbox__buttongroup');
    const toggle = (name: string) => () => (this.toolboxGroup = this.toolboxGroup === name ? null : name);
    const entry = ({ kind, label, icon }: Entry) => html`
        <sl-tooltip content=${label} placement="top">
            <sl-button
                circle
                class="toolbox__btn"
                aria-label=${label}
                @click=${() => this.addNode(kind)}
            >
                <sl-icon src=${icon}></sl-icon>
            </sl-button>
        </sl-tooltip>
    `;
    return html`
        <div
            class="toolbox"
            style=${this.mode == 'edit' ? 'display: flex;' : 'display: none;'}
            @keydown=${(event: KeyboardEvent) => {
                if (event.key !== 'Escape' || (!this.toolboxOpen && !this.toolboxGroup)) return;
                event.preventDefault();
                event.stopPropagation();
                if (this.toolboxGroup) this.toolboxGroup = null;
                else this.toolboxOpen = false;
            }}
        >
            <sl-button
                size="large"
                circle
                class="toolbox__open"
                aria-label=${this.msg('Add')}
                aria-expanded=${this.toolboxOpen ? 'true' : 'false'}
                aria-controls="toolboxButtons"
                @click=${() => {
                    this.toolboxOpen = !this.toolboxOpen;
                    this.toolboxGroup = null;
                }}
            >
                <sl-icon src=${iconPlus}></sl-icon>
            </sl-button>

            <div class=${this.toolboxOpen ? 'toolbox__buttons' : 'toolbox__buttons closed'} id="toolboxButtons">
                <div class=${group('hosts')}>
                    <sl-button
                        circle
                        class="toolbox__btn"
                        aria-label=${this.msg('Hosts')}
                        aria-expanded=${this.toolboxGroup === 'hosts' ? 'true' : 'false'}
                        ?disabled=${this.drawModeOn}
                        @click=${toggle('hosts')}
                    >
                        <sl-icon src=${iconUser}></sl-icon>
                    </sl-button>
                    <div class="toolbox__subbuttons">
                        ${entry({ kind: 'computer', label: this.msg('Computer'), icon: iconDeviceDesktop })}
                        ${entry({ kind: 'mobile', label: this.msg('Mobile device'), icon: iconDeviceMobile })}
                    </div>
                </div>
                <div class=${group('devices')}>
                    <sl-button
                        circle
                        class="toolbox__btn"
                        aria-label=${this.msg('Network devices')}
                        aria-expanded=${this.toolboxGroup === 'devices' ? 'true' : 'false'}
                        ?disabled=${this.drawModeOn}
                        @click=${toggle('devices')}
                    >
                        <sl-icon src=${iconServer}></sl-icon>
                    </sl-button>
                    <div class="toolbox__subbuttons">
                        ${entry({ kind: 'router', label: this.msg('Router'), icon: iconRouter })}
                        ${entry({ kind: 'access-point', label: this.msg('Access point'), icon: iconAccessPoint })}
                        ${entry({ kind: 'repeater', label: this.msg('Repeater'), icon: iconServer })}
                        ${entry({ kind: 'hub', label: this.msg('Hub'), icon: iconTopologyStar3 })}
                        ${entry({ kind: 'bridge', label: this.msg('Bridge'), icon: iconTopologyBus })}
                        ${entry({ kind: 'switch', label: this.msg('Switch'), icon: iconSwitchHorizontal })}
                    </div>
                </div>
                <div class="toolbox__buttongroup">
                    <sl-tooltip content=${this.msg('Edge')} placement="left">
                        <sl-button
                            circle
                            class="toolbox__btn"
                            aria-label=${this.msg('Edge')}
                            aria-pressed=${this.drawModeOn ? 'true' : 'false'}
                            variant=${this.drawModeOn ? 'primary' : 'default'}
                            @click=${() => this.toggleDrawMode()}
                        >
                            <sl-icon src=${iconShare}></sl-icon>
                        </sl-button>
                    </sl-tooltip>
                </div>
                <div class=${group('nets')}>
                    <sl-tooltip content=${this.msg('Network')} placement="bottom">
                        <sl-button
                            circle
                            class="toolbox__btn"
                            aria-label=${this.msg('Network')}
                            aria-expanded=${this.toolboxGroup === 'nets' ? 'true' : 'false'}
                            ?disabled=${this.drawModeOn}
                            @click=${() => {
                                this.addNode('net');
                                this.toolboxGroup = 'nets';
                            }}
                        >
                            <sl-icon src=${iconTopologyFullHierarchy}></sl-icon>
                        </sl-button>
                    </sl-tooltip>

                    <div class="toolbox__subbuttons">
                        <sl-tooltip content=${this.msg('Network assignment')} placement="top">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                aria-label=${this.msg('Network assignment')}
                                aria-pressed=${this.mutexDragAndDrop === 'subnetting' ? 'true' : 'false'}
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
                                aria-label=${this.msg('Gateway assignment')}
                                aria-pressed=${this.mutexDragAndDrop === 'gateway' ? 'true' : 'false'}
                                variant=${this.mutexDragAndDrop === 'gateway' ? 'primary' : 'default'}
                                @click=${() => this.toggleAssigningGateway()}
                            >
                                <sl-icon src=${iconCloudUpload}></sl-icon>
                            </sl-button>
                        </sl-tooltip>
                        <sl-tooltip content=${this.msg('Validate global address assignments')} placement="top">
                            <sl-button
                                circle
                                class="toolbox__btn"
                                aria-label=${this.msg('Validate global address assignments')}
                                @click=${() => this.validateAllNets()}
                            >
                                <sl-icon src=${iconCloudCheck}></sl-icon>
                            </sl-button>
                        </sl-tooltip>
                    </div>
                </div>
            </div>
        </div>
    `;
}
