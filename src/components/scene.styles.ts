import { css, unsafeCSS } from 'lit';
import datagram2header from '../assets/datagram/2header.png';
import datagram2header3header from '../assets/datagram/2header-3header.png';
import datagram2partGreen from '../assets/datagram/2part-green.png';
import datagram2partRed from '../assets/datagram/2part-red.png';
import datagram3header from '../assets/datagram/3header.png';
import datagram3partGreen from '../assets/datagram/3part-green.png';
import datagram3partRed from '../assets/datagram/3part-red.png';

const picture = (url: string) => unsafeCSS(`url("${url}")`);

export const sceneStyles = css`
    ww-scene {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: black;
        -webkit-touch-callout: none;
    }

    ww-path {
        stroke-width: 1px;
    }
    ww-path.unconfigured-edge {
        stroke-dasharray: 1px 3px;
        opacity: 0.8;
    }
    ww-path.wireless-edge {
        stroke-dasharray: 6px 3px;
    }

    ww-path ww-text {
        font-family: monospace;
        font-size: 8px;
        white-space: pre-line;
        text-anchor: middle;
        fill: black;
    }

    ww-group.net,
    ww-shape.net {
        font-family: monospace;
        font-size: 8px;
        stroke: none;
    }

    ww-node {
        font-family: monospace;
    }
    ww-node.physical-node {
        font-size: 15px;
    }
    ww-node.physical-node .picture {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 5px;
        background-repeat: no-repeat;
        background-position: center;
        background-size: 16px;
    }
    ww-node.physical-node .name {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        white-space: pre;
        pointer-events: none;
    }
    ww-node.physical-node .badge {
        position: absolute;
        top: -6px;
        right: -6px;
        font-size: 10px;
        pointer-events: none;
    }
    ww-node[data-ww-link] {
        cursor: crosshair;
        outline: 1px dashed #0291db;
    }
    ww-node[data-ww-port-candidate] {
        outline-width: 2px;
    }
    ww-node[data-ww-port-over] {
        background: #0291db55;
    }

    ww-node.data-node {
        pointer-events: none;
        font-size: 10px;
        background-size: 100% 100%;
        background-repeat: no-repeat;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
    }
    ww-node.data-node-layer2-layer3 {
        background-image: ${picture(datagram2header3header)};
    }
    ww-node.arp-req-node,
    ww-node.arp-res-node {
        background-image: ${picture(datagram2header)};
    }
    ww-node.data-node-layer3 {
        background-image: ${picture(datagram3header)};
    }
    ww-node.processing-data-node-2part {
        background-image: ${picture(datagram2partGreen)};
    }
    ww-node.discard-data-node-2part {
        background-image: ${picture(datagram2partRed)};
    }
    ww-node.processing-data-node-3part {
        background-image: ${picture(datagram3partGreen)};
    }
    ww-node.discard-data-node-3part {
        background-image: ${picture(datagram3partRed)};
    }
`;
