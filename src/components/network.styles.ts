import { css } from 'lit';

export const networkStyles = css`
    :host {
        display: block;
        box-sizing: border-box;
        overflow: hidden;
    }
    :host(:not(:fullscreen):not(.ww-fullscreen)) {
        border: 1px solid var(--sl-color-neutral-300, #d4d4d8);
        border-radius: var(--sl-border-radius-medium, 0.375rem);
    }
    #myCanvas {
        position: relative;
        width: 100%;
        background-color: white;
    }
    /** scrollbar **/
    ::-webkit-scrollbar {
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb {
        background: #8ba8cc;
        border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #0291db;
    }

    /** SL-BUTTON **/
    sl-button::part(base),
    sl-button::part(label) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /** SL-INPUT **/
    sl-input.danger::part(base) {
        border-color: var(--sl-color-danger-600);
    }

    sl-input.danger:focus-within::part(base) {
        border-color: var(--sl-color-danger-600);
        box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-color-danger-300);
    }

    sl-input.success::part(base) {
        border-color: var(--sl-color-success-600);
    }

    sl-input.success:focus-within::part(base) {
        border-color: var(--sl-color-success-600);
        box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-color-success-300);
    }

    /** SL-DETAILS **/
    sl-details::part(base) {
        height: fit-content;
        background-color: #f1f1f1;
        border: none;
    }
    sl-details::part(summary) {
        font-size: 14px;
        font-weight: 600;
        color: #f2f2f2;
    }
    sl-details::part(header) {
        background-color: #8ba8cc;
    }
    sl-details table,
    sl-details th,
    sl-details td {
        border: 1px solid #8ba8cc;
        border-collapse: collapse;
        color: black !important;
    }
    sl-details th,
    sl-details td {
        padding: 10px;
    }
    sl-tab-panel::part(base) {
        font-size: max(0.8cqw, 11px);
    }

    sl-select::part(base) {
        --width: fit-content;
    }

    /** tables **/
    td {
        text-align: center;
    }
    .modeSwitch {
        position: absolute;
        left: var(--sl-spacing-small);
        top: var(--sl-spacing-small);
        width: 150px;

        z-index: 1000;
    }

    .viewportControls {
        position: absolute;
        right: var(--sl-spacing-small);
        bottom: var(--sl-spacing-small);
        z-index: 1000;
    }

    .fullscreenButton {
        position: absolute;
        right: var(--sl-spacing-small);
        top: var(--sl-spacing-small);
        width: 50px;
        height: 50px;

        z-index: 1000;
    }
`;

export const toastStyles = css`
    .toasts {
        position: absolute;
        top: var(--sl-spacing-small);
        right: calc(var(--sl-spacing-small) * 2 + 50px);
        width: min(24rem, calc(100% - 2 * var(--sl-spacing-small) - 50px - 150px));
        z-index: 1001;
        display: flex;
        flex-direction: column;
        gap: var(--sl-spacing-small);
    }
    .toast__message {
        white-space: pre-line;
    }
`;
