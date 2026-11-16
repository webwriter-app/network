import { css } from 'lit';

export const toolboxStyles = css`
    .toolbox {
        position: absolute;
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-start;

        left: 10px;
        bottom: 10px;
    }

    .toolbox sl-button::part(base) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toolbox__buttons {
        display: flex;
        flex-direction: column;

        position: relative;

        height: auto;
        margin-left: calc((var(--sl-input-height-large) - var(--sl-input-height-medium)) * 0.5);
    }

    .toolbox__buttongroup {
        display: flex;
        flex-direction: row;
        margin-bottom: 5px;
    }
    .toolbox__subbuttons {
        display: none;
    }

    .toolbox__buttons.closed {
        display: none;
    }

    .toolbox__buttongroup sl-button {
        margin-right: 5px;
    }

    .toolbox__buttongroup:not(:has(sl-button[disabled])):hover .toolbox__subbuttons {
        display: flex;
        flex-direction: row;
    }
`;
