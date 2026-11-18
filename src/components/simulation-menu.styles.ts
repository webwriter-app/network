import { css } from 'lit';

export const simulationMenuStyles = css`
    .simulationmenu {
        position: absolute;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;

        flex-wrap: wrap;
        gap: var(--sl-spacing-2x-small);
        left: var(--sl-spacing-small);
        bottom: var(--sl-spacing-small);
        max-width: calc(100% - 2 * var(--sl-spacing-small));
    }

    .simulationmenu sl-select {
        min-width: 8rem;
    }

    @container (max-width: 640px) {
        .simulationmenu {
            flex-direction: column;
            align-items: flex-start;
            max-width: calc(100% - 140px);
        }
    }

    @media print {
        .simulationmenu {
            display: none !important;
        }
    }

    .simulationmenu sl-button::part(base) {
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
