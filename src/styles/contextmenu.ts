import { css } from 'lit';

export const contextMenuStyles = css`
    .contextmenu {
        position: absolute;
        display: flex;
        flex-direction: column;

        background-color: white;
        outline: red solid 1px;

        padding: var(--sl-spacing-small);

        z-index: 1200;
    }

    .contextmenu__header {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--sl-spacing-small);
    }

    .contextmenu__title {
        font-size: 1.2em;
    }

    .configdrawer {
        --size: min(100%, 24rem);
        --header-spacing: var(--sl-spacing-medium);
        --body-spacing: var(--sl-spacing-medium);
        --footer-spacing: var(--sl-spacing-small);

        font-family: var(--sl-font-sans);
        font-size: var(--sl-font-size-small);
        color: var(--sl-color-neutral-900, #18181b);
    }

    .configdrawer::part(base) {
        z-index: 1300;
    }

    .configdrawer::part(panel) {
        border-inline-start: solid 1px var(--sl-color-neutral-200, #e4e4e7);
        box-shadow: -6px 0 24px rgb(0 0 0 / 12%);
    }

    .configdrawer::part(header) {
        align-items: center;
        gap: var(--sl-spacing-2x-small);

        border-bottom: solid 1px var(--sl-color-neutral-200, #e4e4e7);
    }

    .configdrawer::part(title) {
        padding: var(--sl-spacing-small) var(--sl-spacing-medium);

        font-size: var(--sl-font-size-medium);
        font-weight: var(--sl-font-weight-semibold);
    }

    .configdrawer::part(header-actions) {
        padding-inline: var(--sl-spacing-small);
    }

    .configdrawer::part(footer) {
        border-top: solid 1px var(--sl-color-neutral-200, #e4e4e7);
    }

    .configdrawer__stack,
    .configdrawer__fields {
        display: flex;
        flex-direction: column;
    }

    .configdrawer__fields {
        gap: var(--sl-spacing-small);
    }

    .configdrawer__fields sl-input,
    .configdrawer__fields sl-select {
        width: 100%;
    }

    .configdrawer [slot='prefix'] > svg,
    .configdrawer [slot='suffix'] > svg {
        display: block;
    }

    .configdrawer__empty {
        margin: 0;
        color: var(--sl-color-neutral-500, #71717a);
        font-size: var(--sl-font-size-small);
    }

    .configdrawer sl-divider {
        --spacing: var(--sl-spacing-2x-small);
        --color: var(--sl-color-neutral-200, #e4e4e7);
    }

    .configdrawer sl-details.portcard::part(base) {
        border: none;
        border-radius: 0;
        background-color: transparent;
    }

    .configdrawer sl-details.portcard::part(header) {
        gap: var(--sl-spacing-2x-small);

        padding: var(--sl-spacing-x-small);
        margin-inline: calc(-1 * var(--sl-spacing-2x-small));

        border-radius: var(--sl-border-radius-medium, 0.375rem);
        background-color: transparent;
    }

    .configdrawer sl-details.portcard::part(header):hover {
        background-color: var(--sl-color-neutral-100, #f4f4f5);
    }

    .configdrawer sl-details.portcard::part(summary) {
        min-width: 0;
        font: inherit;
        color: inherit;
    }

    .configdrawer sl-details.portcard::part(summary-icon) {
        color: var(--sl-color-neutral-500, #71717a);
    }

    .configdrawer sl-details.portcard::part(content) {
        padding: var(--sl-spacing-x-small) 0 var(--sl-spacing-2x-small);
    }

    .portcard__summary {
        flex: 1 1 auto;

        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--sl-spacing-small);

        min-width: 0;
    }

    .portcard__index {
        flex: 0 0 auto;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        min-width: 1.5rem;
        height: 1.5rem;
        padding: 0 var(--sl-spacing-3x-small);
        box-sizing: border-box;

        border-radius: var(--sl-border-radius-pill, 9999px);
        background-color: var(--sl-color-neutral-100, #f4f4f5);
        color: var(--sl-color-neutral-700, #3f3f46);

        font-size: var(--sl-font-size-x-small);
        font-weight: var(--sl-font-weight-semibold);
        font-variant-numeric: tabular-nums;
    }

    .portcard__title {
        flex: 1 1 auto;
        min-width: 0;

        font-size: var(--sl-font-size-small);
        font-weight: var(--sl-font-weight-semibold);

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .portcard__remove {
        flex: 0 0 auto;
        margin-inline-end: var(--sl-spacing-2x-small);
    }

    .portcard__remove::part(base):hover {
        color: var(--sl-color-danger-600, #dc2626);
        border-color: var(--sl-color-danger-300, #fca5a5);
    }

    .endpoint {
        display: flex;
        flex-direction: column;
        gap: var(--sl-spacing-small);
    }

    .endpoint__header {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--sl-spacing-small);
    }

    .endpoint__image {
        flex: 0 0 auto;

        width: 2.75rem;
        height: 2.75rem;

        padding: var(--sl-spacing-x-small);
        box-sizing: border-box;

        border-radius: var(--sl-border-radius-medium, 0.375rem);

        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;
        background-origin: content-box;
    }

    .endpoint__names {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .endpoint__role {
        color: var(--sl-color-neutral-500, #71717a);
        font-size: var(--sl-font-size-x-small);
        text-transform: uppercase;
    }

    .endpoint__title {
        font-size: var(--sl-font-size-small);
        font-weight: var(--sl-font-weight-semibold);

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .endpoint__mac {
        color: inherit;
        opacity: 0.65;
        font-size: var(--sl-font-size-x-small);
        font-variant-numeric: tabular-nums;
    }

    .configdrawer sl-divider.endpoint__link {
        --spacing: var(--sl-spacing-medium);
    }
`;
