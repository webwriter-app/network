import { css } from 'lit';

export const simulationMenuStyles = css`
    .simulationmenu {
        position: absolute;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;

        left: var(--sl-spacing-small);
        bottom: var(--sl-spacing-small);
    }

    .simulationmenu sl-button::part(base) {
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
