import { html, type TemplateResult } from 'lit';
import iconAlertTriangle from '@tabler/icons/outline/alert-triangle.svg';
import iconInfoCircle from '@tabler/icons/outline/info-circle.svg';
import type { WwNetwork } from '../widgets/ww-network';

export type Toast = { id: number; variant: 'primary' | 'neutral' | 'warning'; header: string; message: string };

/** The notices of the widget, stacked in its top right corner. */
export function toastsTemplate(this: WwNetwork): TemplateResult {
    return html`
        <div class="toasts" aria-live="polite">
            ${this.toasts.map(
                (toast) => html`
                    <sl-alert
                        open
                        closable
                        duration="5000"
                        variant=${toast.variant}
                        @sl-after-hide=${() => this.dismissToast(toast.id)}
                    >
                        <sl-icon slot="icon" src=${toast.variant == 'warning' ? iconAlertTriangle : iconInfoCircle}></sl-icon>
                        ${toast.header ? html`<strong>${toast.header}</strong><br />` : ''}
                        <span class="toast__message">${toast.message}</span>
                    </sl-alert>
                `
            )}
        </div>
    `;
}
