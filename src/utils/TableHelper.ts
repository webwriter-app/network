import { SlButton, SlDetails, SlInput } from '@shoelace-style/shoelace';
import { NetworkComponent } from '..';
import { DataHandlingDecorator } from '../components/dataDecorators/DataHandlingDecorator';
import { RoutableDecorator } from '../components/dataDecorators/Routable';
import { SwitchableDecorator } from '../components/dataDecorators/Switchable';
import { TableType } from '../event-handlers/packet-simulator';
import { AlertHelper } from './AlertHelper';
import { RoutingData } from './routingData';
import { msg } from '@lit/localize';

export class TableHelper {
    static tableContainer(network: NetworkComponent): SlDetails | null {
        return network.renderRoot.querySelector('#tables-for-packet-simulator') as SlDetails | null;
    }

    static addRow(tableID: string, tableType: TableType, network: NetworkComponent, tableData?: any[]) {
        var table = network.renderRoot.querySelector('#' + tableID) as HTMLTableElement | null;
        if (table == null) return; //tables are only rendered while editable

        var rowCount = table.rows.length;
        var row = table.insertRow(rowCount);

        var cell1: HTMLTableCellElement = row.insertCell(0);
        var element1 = document.createElement('input');
        element1.type = 'checkbox';
        element1.name = 'chkbox[]';
        cell1.appendChild(element1);

        switch (tableType) {
            case 'ArpTable':
                var cell2 = row.insertCell(1);
                var element2 = document.createElement('sl-input') as SlInput;
                element2.placeholder = '0.0.0.0';
                element2.pattern = '^(?:[0-9]{1,3}.){3}[0-9]{1,3}$';
                if (tableData != undefined) element2.value = tableData[0];

                var cell3 = row.insertCell(2);
                var element3 = document.createElement('sl-input') as SlInput;
                element3.placeholder = 'FF:FF:FF:FF:FF:FF';
                element3.pattern = '/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/';
                if (tableData != undefined) element3.value = tableData[1];

                cell2.appendChild(element2);
                cell3.appendChild(element3);
                break;

            case 'RoutingTable':
                var cell2 = row.insertCell(1);
                var element2 = document.createElement('sl-input') as SlInput;
                element2.placeholder = '0.0.0.0';
                element2.pattern = '^(?:[0-9]{1,3}.){3}[0-9]{1,3}$';
                if (tableData != undefined) element2.value = tableData[0];
                cell2.appendChild(element2);

                var cell3 = row.insertCell(2);
                var element3 = document.createElement('sl-input') as SlInput;
                element3.placeholder = 'on-link / 0.0.0.0';
                if (tableData != undefined) element3.value = tableData[1];
                cell3.appendChild(element3);

                var cell4 = row.insertCell(3);
                var element4 = document.createElement('sl-input') as SlInput;
                element4.type = 'number';
                element4.min = 0;
                element4.max = 32;
                if (tableData != undefined) element4.value = tableData[2];
                cell4.appendChild(element4);

                var cell = row.insertCell(4);
                var element = document.createElement('sl-input') as SlInput;
                element.type = 'number';
                element.min = '0';
                if (tableData != undefined) element.value = tableData[3];
                cell.appendChild(element);

                break;

            case 'MacAddressTable':
                var cell2 = row.insertCell(1);
                var element2 = document.createElement('sl-input') as SlInput;
                element2.type = 'number';
                element2.min = '0';
                if (tableData != undefined) element2.value = tableData[0];
                cell2.appendChild(element2);

                var cell3 = row.insertCell(2);
                var element3 = document.createElement('sl-input') as SlInput;
                element3.placeholder = 'FF:FF:FF:FF:FF:FF';
                element3.pattern = '/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/';
                if (tableData != undefined) element3.value = tableData[1];
                cell3.appendChild(element3);
                break;
        }
    }

    static deleteRow(tableID: string, network: NetworkComponent) {
        try {
            var table = network.renderRoot.querySelector('#' + tableID) as HTMLTableElement;
            var rowCount = table.rows.length;

            for (var i = 0; i < rowCount; i++) {
                var row = table.rows[i];
                var chkbox = row.cells[0].childNodes[0] as HTMLInputElement;
                if (null != chkbox && true == chkbox.checked) {
                    table.deleteRow(i);
                    rowCount--;
                    i--;
                }
            }
        } catch (e) {
            alert(e);
        }
    }

    static updateTable(tableID: string, tableType: TableType, network: NetworkComponent) {
        //gets table
        var oTable = network.renderRoot.querySelector('#' + tableID) as HTMLTableElement;

        //gets rows of table
        var rowLength = oTable.rows.length;

        let nodeId: string;
        let node: DataHandlingDecorator;
        switch (tableType) {
            case 'ArpTable':
                nodeId = tableID.split('-')[2];
                node = network._graph.$('#' + nodeId).data() as RoutableDecorator;
                (node as RoutableDecorator).arpTableIpMac = new Map();
                (node as RoutableDecorator).arpTableMacIp = new Map();
                break;
            case 'MacAddressTable':
                nodeId = tableID.split('-')[3];
                node = network._graph.$('#' + nodeId).data() as SwitchableDecorator;
                (node as SwitchableDecorator).macAddressTable = new Map();
                break;
            case 'RoutingTable':
                nodeId = tableID.split('-')[2];
                node = network._graph.$('#' + nodeId).data() as RoutableDecorator;
                (node as RoutableDecorator).routingTable = new Map();
                break;
        }

        //loops through rows (skip header row)
        for (let i = 1; i < rowLength; i++) {
            //gets cells of current row
            var oCells = oTable.rows.item(i)!.cells;

            //gets amount of cells of current row
            var cellLength = oCells.length;

            let cellData = [];

            //loops through each cell in current row
            for (var j = 1; j < cellLength; j++) {
                var cellVal: SlInput = oCells.item(j)!.childNodes[0] as SlInput;
                cellData.push(cellVal.value);
            }

            switch (tableType) {
                case 'ArpTable':
                    (node as RoutableDecorator).arpTableIpMac.set(cellData[0], cellData[1]);
                    (node as RoutableDecorator).arpTableMacIp.set(cellData[1], cellData[0]);
                    break;
                case 'MacAddressTable':
                    (node as SwitchableDecorator).macAddressTable.set(cellData[0], +cellData[1]);
                    break;
                case 'RoutingTable':
                    let port: number = +cellData[3];
                    (node as RoutableDecorator).routingTable.set(
                        cellData[0],
                        new RoutingData(
                            cellData[0],
                            cellData[1],
                            +cellData[2],
                            node.portData.get(port)!.get('Name'),
                            port
                        )
                    );
                    break;
            }
        }

        AlertHelper.toastAlert('success', 'check2-circle', '', msg('Your table is saved!'));
    }

    /**
     *
     * @param tableId
     * @param tableType
     * @param tableData (ip,mac) for ArpTable
     * @param network
     */
    static reloadTable(tableId: string, tableType: TableType, tableData: any, network: NetworkComponent) {
        var table = network.renderRoot.querySelector('#' + tableId) as HTMLTableElement | null;
        if (table == null) return;
        switch (tableType) {
            case 'ArpTable':
                table.innerHTML = '<tr><td></td><td>IP</td><td>MAC</td></tr>';
                (tableData as Map<string, string>).forEach((mac, ip) => {
                    TableHelper.addRow(tableId, tableType, network, [ip, mac]);
                });
                break;
            case 'MacAddressTable':
                table.innerHTML = '<tr><td></td><td>Port</td><td>MAC</td></tr>';
                (tableData as Map<string, number>).forEach((port, mac) => {
                    TableHelper.addRow(tableId, tableType, network, [port, mac]);
                });
                break;
            case 'RoutingTable':
                table.innerHTML = `<tr><td></td><td>ID</td><td>${msg('Gateway')}</td><td>${msg('Bitmask')}</td><td>Port</td></tr>`;
                (tableData as Map<string, RoutingData>).forEach((routingData) => {
                    TableHelper.addRow(tableId, tableType, network, [
                        routingData.destination,
                        routingData.gateway,
                        routingData.bitmask,
                        routingData.port,
                    ]);
                });
                break;
        }
    }

    static initTable(nodeId: string, tableType: TableType, network: NetworkComponent): void {
        let label = '';
        let tableId = '';
        let tableCols = '';
        switch (tableType) {
            case 'ArpTable':
                label = msg('ARP Table');
                tableId = 'arp-table-' + nodeId;
                tableCols = '<tr><td></td><td>IP</td><td>MAC</td></tr>';
                break;

            case 'RoutingTable':
                label = msg('Routing Table');
                tableId = 'routing-table-' + nodeId;
                tableCols = `<tr><td></td><td>ID</td><td>${msg('Gateway')}</td><td>${msg('Bitmask')}</td><td>Port</td></tr>`;
                break;

            case 'MacAddressTable':
                label = msg('Mac Address Table');
                tableId = 'mac-address-table-' + nodeId;
                tableCols = '<tr><td></td><td>Port</td><td>MAC</td></tr>';
                break;
        }

        let detail = network.renderRoot.querySelector('#details-for-' + tableId) as SlDetails;
        if (detail == null) {
            const container = TableHelper.tableContainer(network);
            if (container == null) return; //no table UI outside of the editor
            detail = document.createElement('sl-details') as SlDetails;
            detail.id = '#details-for-' + tableId;
            detail.summary = label + ' of ' + nodeId;
            detail.className = 'details-for-table';
            detail.open = true;
            container.appendChild(detail);
        }
        switch (tableType) {
            case 'ArpTable':
                detail.innerHTML +=
                    `<table class="fixedArp" id="arp-table-` + nodeId + `">` + tableCols + `</table></div><br/>`;
                break;
            case 'RoutingTable':
                detail.innerHTML +=
                    `<table class="fixedRout" id="routing-table-` + nodeId + `">` + tableCols + `</table></div><br/>`;
                break;
            case 'MacAddressTable':
                detail.innerHTML +=
                    `<table class="fixedMac" id="mac-address-table-` +
                    nodeId +
                    `">` +
                    tableCols +
                    `</table></div><br/>`;
                break;
        }

        let addButton = document.createElement('sl-button') as SlButton;
        addButton.size = 'small';
        addButton.innerHTML = msg('Add');
        addButton.addEventListener('click', () => TableHelper.addRow(tableId, tableType, network));

        let removeButton = document.createElement('sl-button') as SlButton;
        removeButton.size = 'small';
        removeButton.innerHTML = msg('Remove');
        removeButton.addEventListener('click', () => TableHelper.deleteRow(tableId, network));

        let saveButton = document.createElement('sl-button') as SlButton;
        saveButton.size = 'small';
        saveButton.innerHTML = msg('Save');
        saveButton.addEventListener('click', () => TableHelper.updateTable(tableId, tableType, network));

        detail.append(addButton);
        detail.append(removeButton);
        detail.append(saveButton);
    }
}
