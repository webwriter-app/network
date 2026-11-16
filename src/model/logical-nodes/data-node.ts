import { LogicalNode } from './logical-node';

export abstract class Data extends LogicalNode {
    layer2header: any;

    constructor(color: string) {
        super(color);
        this.cssClass.push('data-node');
    }
}

export class Packet extends Data {
    layer2header = {
        macSender: '',
        macReceiver: '',
    };
    layer3header = {
        ipSender: '',
        ipReceiver: '',
    };

    constructor(color: string, macSender: string, macReceiver: string, ipv4Sender: string, ipv4Receiver: string) {
        super(color);
        this.id = 'packet' + crypto.randomUUID();
        this.layer2header.macSender = macSender;
        this.layer2header.macReceiver = macReceiver;
        this.layer3header.ipSender = ipv4Sender;
        this.layer3header.ipReceiver = ipv4Receiver;
        this.cssClass.push('packet-node');
        if (macSender != '' && macReceiver != '') {
            this.cssClass.push('data-node-layer2-layer3');
        } else {
            this.cssClass.push('data-node-layer3');
        }
    }

    static cloneData(data: Packet): Packet {
        let newData: Packet = new Packet(
            data.color,
            data.layer2header.macSender,
            data.layer2header.macReceiver,
            data.layer3header.ipSender,
            data.layer3header.ipReceiver
        );
        return newData;
    }
}

export class Frame extends Data {
    layer2header = {
        macSender: '',
        macReceiver: '',
        ipSender: '',
        ipReceiver: '',
    };

    private constructor(color: string) {
        super(color);
        this.id = 'frame' + crypto.randomUUID();
        this.cssClass.push('frame-node');
    }

    static cloneData(data: Frame): Frame {
        let newData: Frame = new Frame(data.color);
        newData.cssClass = data.cssClass;
        newData.layer2header = data.layer2header;
        newData.name = data.name;
        return newData;
    }

    static createArpRequest(color: string, macSender: string, ipSender: string, ipReceiver: string): Frame {
        let arpReq: Frame = new Frame(color);
        arpReq.layer2header.macSender = macSender;
        arpReq.layer2header.macReceiver = 'FF:FF:FF:FF:FF:FF'; //broadcast
        arpReq.layer2header.ipSender = ipSender;
        arpReq.layer2header.ipReceiver = ipReceiver;
        arpReq.name = 'L2 ARP req';
        arpReq.cssClass.push('arp-req-node');
        return arpReq;
    }

    static createArpResponse(
        color: string,
        macSender: string,
        macReceiver: string,
        ipSender: string,
        ipReceiver: string
    ): Frame {
        let arpRes: Frame = new Frame(color);
        arpRes.layer2header.macSender = macSender;
        arpRes.layer2header.macReceiver = macReceiver;
        arpRes.layer2header.ipSender = ipSender;
        arpRes.layer2header.ipReceiver = ipReceiver;
        arpRes.name = 'L2 ARP res';
        arpRes.cssClass.push('arp-res-node');
        return arpRes;
    }
}
