import { css } from 'lit';

export const networkStyles = css`
    :host {
        overflow: hidden;
    }
    :host(:not(:fullscreen):not(.ww-fullscreen)) {
        border: 1px solid var(--sl-color-neutral-300, #d4d4d8);
        border-radius: var(--sl-border-radius-medium, 0.375rem);
    }
    .main-container {
        container-type: inline-size;
        height: 100%;
        width: 100%;
    }
    .base {
        display: flex;
        width: 75cqw;
        height: 12cqw;
        min-height: 192px;
        margin-bottom: 1cqw;
        background-color: #f1f1f1;
    }
    .addOption {
        width: 12cqw;
        display: flex;
        flex-direction: row;
        gap: 1.5cqw;
        margin: auto;
    }
    .colorPalette {
        position: flex;
        width: 10.2cqw;
        margin: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 1.4cqw;
        height: 10.2cqw;
    }
    #myCanvas {
        position: relative;
        width: 100%;
        background-color: white;
    }
    #cy {
        height: 100%;
        width: 100%;
        position: absolute;
    }
    .componentMenu {
        position: relative;
        width: 25cqw;
        display: flex;
        flex-direction: row;
        gap: auto;
        padding: auto;
        margin: auto;
    }
    .nameBox {
        position: relative;
        margin: 0 auto;
    }
    .sidebar {
        height: calc(100cqh - 1.5cqw);
        position: fixed;
        right: 0;
        background: #f1f1f1;
        width: 23.7cqw;
    }

    /** Buttons **/
    .btn {
        border-radius: 0.5cqw;
        background-color: #8ba8cc;
        border: solid 1px transparent;
        color: white;
        align-items: center;
        font-size: 1.6cqw;
        cursor: pointer;
        width: 4cqw;
        height: 4cqw;
        margin: auto;
    }
    .importBtn {
        border-radius: 0.3cqw;
        background-color: #8ba8cc;
        border: solid 1px transparent;
        color: white;
        align-items: center;
        font-size: 0.8cqw;
        cursor: pointer;
        margin: auto;
    }
    button:hover:enabled {
        background-color: #0291db;
    }
    .addBtn {
        border-radius: 0.5cqw;
        background-color: #8ba8cc;
        border: solid 1px transparent;
        color: white;
        align-items: center;
        font-size: 1cqw;
        cursor: pointer;
        width: 3cqw;
        height: 3cqw;
    }
    button:disabled,
    button[disabled],
    #drawBtn:disabled,
    #resetColorBtn:disabled {
        border: 1px solid #bfbfbf;
        background-color: #e8e8e8 !important;
        color: #858585;
    }
    .colorButton {
        border-radius: 0.3cqw;
        border: solid 1px #adadad;
        cursor: pointer;
        width: 1.5cqw;
        height: 1.5cqw;
    }
    .blue-button::part(base) {
        background-color: #f1f1f1;
        border: none;
        align-items: center;
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

    /** CONTEXTUAL MENU - cytoscape **/
    .custom-menu-item {
        border: none !important;
        height: 3cqw !important;
        width: 8cqw !important;
        padding-left: 1cqw !important;
        color: black !important;
        background-color: white !important;
        font-weight: normal !important;
        font-size: 0.8cqw !important;
        text-align: left !important;
        box-shadow: none !important;
    }
    .custom-menu-item:hover {
        background-color: #f1f1f1 !important;
    }
    .custom-context-menu {
        border: none !important;
        padding-top: 0.5cqw !important;
        padding-bottom: 0.5cqw !important;
        border-radius: 0.2cqw !important;
        background-color: #fafafa !important;
        box-shadow: 0px 0px 8px 0px rgb(0, 0, 0, 0.12), 0px 8px 8px 0px rgb(0, 0, 0, 0.24) !important;
    }

    /** SL-BUTTON **/
    sl-button::part(base),
    sl-button::part(label) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /** SL-INPUT **/
    /* sl-input::part(base),
    sl-input::part(input) {
        border: none;
        font-size: max(0.8cqw, 11px);
        height: max(35px, 1.5cqw);
    } */
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

    .label-on-left {
        --label-width: 3cqw;
        --gap-width: 2cqw;
        margin: auto;
    }
    .label-on-left::part(form-control) {
        display: grid;
        grid: auto / var(--label-width) 1fr;
        gap: 1cqw;
        align-items: center;
    }
    .label-on-left::part(form-control-label) {
        text-align: right;
        font-size: max(0.8cqw, 11px);
    }
    .label-on-left::part(form-control-help-text) {
        grid-column: span 2;
        padding-left: calc(var(--label-width) + var(--gap-width));
    }

    /** SL-DETAILS **/
    #packet-sending-extension::part(content) {
        height: fit-content;
    }
    .details-for-table::part(content) {
        width: 320px;
        overflow: auto;
    }
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

    sl-dropdown {
        display: flex;
        justify-content: space-between;
        margin: auto;
    }

    sl-select::part(base) {
        --width: fit-content;
    }

    /** tables **/
    td {
        text-align: center;
    }
    table.fixedRout {
        table-layout: fixed;
        width: 100%;
    }
    table.fixedRout td:nth-of-type(1) {
        width: 20px;
    }
    table.fixedRout td:nth-of-type(2) {
        width: 110px;
    }
    table.fixedRout td:nth-of-type(3) {
        width: 110px;
    }
    table.fixedRout td:nth-of-type(4) {
        width: 70px;
    }
    table.fixedRout td:nth-of-type(5) {
        width: 70px;
    }
    table.fixedRout td:nth-of-type(6) {
        width: 100px;
    }
    table.fixedArp {
        table-layout: fixed;
        width: 100%;
    }
    table.fixedArp td:nth-of-type(1) {
        width: 20px;
    }
    table.fixedArp td:nth-of-type(2) {
        width: 50%;
    }
    table.fixedArp td:nth-of-type(3) {
        width: 42%;
    }
    table.fixedMac {
        table-layout: fixed;
        width: 100%;
    }
    table.fixedMac td:nth-of-type(1) {
        width: 20px;
    }
    table.fixedArp td:nth-of-type(2) {
        width: 40%;
    }
    table.fixedMac td:nth-of-type(3) {
        width: 52%;
    }

    /**sl-card*/
    .card-overview {
        max-width: 300px;
        display: inline-block;
    }

    .card-overview small {
        color: var(--sl-color-neutral-500);
    }

    .card-overview [slot='footer'] {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    /** Container queries **/

    @container (max-width: 1550px) {
        .addOption {
            width: 5cqw;
            flex-direction: column;
        }
    }
    @container (max-width: 1215px) {
        .colorPalette {
            width: 11cqw;
            height: 11cqw;
            gap: 1.5cqw;
        }
        sl-button::part(base) {
            font-size: 0.1cqw;
        }
    }
    @container (max-width: 1123px) {
        .colorPalette {
            gap: 1.4cqw;
        }
    }
    @container (max-width: 1086px) {
        .colorPalette {
            width: 12cqw;
            height: 12cqw;
        }
    }
    @container (max-width: 1041px) {
        .colorPalette {
            width: 13cqw;
            height: 13cqw;
        }
    }
    @container (max-width: 1019px) {
        .colorPalette {
            width: 13.5cqw;
            height: 13.5cqw;
        }
    }
    @container (max-width: 988px) {
        .colorPalette {
            width: 14cqw;
            height: 14cqw;
        }
        .componentMenu {
            width: 9cqw;
            flex-direction: column;
            gap: 0.5cqw;
            padding-left: 1cqw;
        }
        .nameBox {
            width: 30cqw;
        }
        .label-on-left {
            --label-width: 6cqw;
            --gap-width: 2cqw;
            margin: auto;
        }
        sl-input::part(input) {
            width: 10cqw;
        }
    }

    .modeSwitch {
        position: absolute;
        left: var(--sl-spacing-small);
        top: var(--sl-spacing-small);
        width: 150px;

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
