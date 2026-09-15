import { css } from 'lit';

export const contextMenuStyles = css`
    .contextmenu-backdrop {
        position: absolute;
        inset: 0;
        z-index: 1200;
    }

    #contextMenu::part(popup) {
        transform-origin: top left;
        animation: network-context-menu-enter 120ms ease both;
    }

    #contextMenu[data-current-placement$='-end']::part(popup) {
        transform-origin: top right;
    }

    #contextMenu[data-current-placement^='top']::part(popup) {
        transform-origin: bottom left;
    }

    #contextMenu[data-current-placement^='top'][data-current-placement$='-end']::part(popup) {
        transform-origin: bottom right;
    }

    @keyframes network-context-menu-enter {
        from {
            opacity: 0;
            transform: scale(0.96);
        }
        to {
            opacity: 1;
            transform: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #contextMenu::part(popup) {
            animation: none;
        }
    }

    .contextmenu {
        box-sizing: border-box;
        min-width: min(15rem, var(--auto-size-available-width, 15rem));
        max-width: var(--auto-size-available-width, none);
        max-height: var(--auto-size-available-height, none);
        box-shadow: var(--sl-shadow-large, 0 4px 12px rgb(0 0 0 / 15%));
    }

    .contextmenu--tables {
        padding: var(--sl-spacing-small);
    }

    .contextmenu sl-divider {
        --spacing: var(--sl-spacing-x-small);
    }

    .contextmenu sl-menu-item::part(checked-icon) {
        width: 1em;
    }

    .contextmenu sl-menu-item::part(submenu-icon) {
        display: none;
    }

    .contextmenu sl-menu-item::part(base) {
        align-items: center;
        padding-inline-end: var(--sl-spacing-medium);
    }

    .contextmenu [slot='prefix'] > svg {
        display: block;
    }

    .contextmenu__delete:not(:focus-visible)::part(base) {
        color: var(--sl-color-danger-600);
    }

    .contextmenu__name,
    .contextmenu__gateway {
        width: 100%;
        min-width: 0;
    }

    .contextmenu__color-swatch {
        display: block;
        width: 1.75rem;
        height: 1.25rem;
        border-radius: var(--sl-border-radius-small, 0.25rem);
        box-shadow: inset 0 0 0 1px rgb(0 0 0 / 20%);
    }

    .contextmenu__color-popup::part(popup) {
        z-index: 1;
    }

    .contextmenu__color-panel {
        max-width: var(--auto-size-available-width, none);
        max-height: var(--auto-size-available-height, none);
        overflow: auto;
        border-radius: var(--sl-border-radius-medium, 0.375rem);
        background: var(--sl-panel-background-color, white);
        box-shadow: var(--sl-shadow-large, 0 4px 12px rgb(0 0 0 / 15%));
    }

    .configdrawer {
        --size: min(100%, 24rem);
        --header-spacing: var(--sl-spacing-medium);
        --body-spacing: var(--sl-spacing-medium);
        --footer-spacing: var(--sl-spacing-small);

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
