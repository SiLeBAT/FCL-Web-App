import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import { ScrollbarHelper } from '@swimlane/ngx-datatable/release/services/scrollbar-helper.service';
import { ResizeSensor } from 'css-element-queries';

import { Utils } from '../util/utils';
import { DeliveryData, FclElements, ObservedType, ShowType, StationData, TableMode } from '../util/datatypes';
import { Constants } from '../util/constants';

interface FilterableRow {
    content: any;
    stringContent: string;
}

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'app-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {

    columns: any[];
    rows: any[];
    filter: string;
    unfilteredRows: FilterableRow[];

    private data: FclElements;
    private mode = Constants.DEFAULT_TABLE_MODE;
    private stationColumns = Constants.DEFAULT_TABLE_STATION_COLUMNS.toArray();
    private deliveryColumns = Constants.DEFAULT_TABLE_DELIVERY_COLUMNS.toArray();
    private showType = Constants.DEFAULT_TABLE_SHOW_TYPE;

    private resizeTimer: any;

    private changeFunction: () => void;

    @ViewChild('container') container: ElementRef;
    @ViewChild('table') table: DatatableComponent;
    @ViewChild('selectTmpl') selectTmpl: TemplateRef<any>;

    static filterRows(elements: FilterableRow[], filter: string): any[] {
        const words: string[] = filter == null ? [] : filter.split(/\s+/g).map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

        return elements.filter(e => words.find(w => e.stringContent.indexOf(w) === -1) == null).map(e => e.content);
    }

    constructor(private scrollbarHelper: ScrollbarHelper) {
        const style = document.createElement('style');

        style.type = 'text/css';
        style.innerHTML = '';
        style.innerHTML += 'datatable-body-row { background-color: rgb(255, 255, 255) !important; }';

        for (const props of Utils.getAllCombinations(Constants.PROPERTIES_WITH_COLORS.toArray())) {
            style.innerHTML += 'datatable-body-row';

            if (props.length === 1) {
                const color = Utils.colorToCss(Constants.PROPERTIES.get(props[0]).color);

                style.innerHTML += '.' + props[0] + ' { background-color: ' + color + ' !important; }';
            } else {
                for (const prop of props) {
                    style.innerHTML += '.' + prop;
                }

                style.innerHTML += ' { background: repeating-linear-gradient(90deg';

                for (let i = 0; i < props.length; i++) {
                    const color = Utils.colorToCss(Constants.PROPERTIES.get(props[i]).color);
                    const from = i === 0 ? i / props.length * 100 + '%' : (i + 0.2) / props.length * 100 + '%';
                    const to = i === props.length - 1 ? (i + 1) / props.length * 100 + '%' : (i + 0.8) / props.length * 100 + '%';

                    style.innerHTML += ', ' + color + ' ' + from + ', ' + color + ' ' + to;
                }

                style.innerHTML += ') !important; }';
            }
        }

        document.head.appendChild(style);
    }

    ngOnInit() {
        window.onresize = () => {
            Observable.timer(500).subscribe(() => {
                this.update();
            });
        };

        const resizeSensor = new ResizeSensor(this.container.nativeElement, () => {
            if (this.resizeTimer != null) {
                this.resizeTimer.unsubscribe();
            }

            this.resizeTimer = Observable.timer(100).subscribe(() => {
                if (this.columns != null) {
                    this.columns = this.getUpdatedColumns(this.columns);
                    this.table.recalculate();
                }
            });
        });

        this.table.onColumnReorder = () => void(0);
    }

    init(data: FclElements) {
        this.data = data;
        this.update();
    }

    setMode(mode: TableMode) {
        this.mode = mode;
        this.update();
    }

    setStationColumns(stationColumns: string[]) {
        this.stationColumns = Array.from(stationColumns);
        this.update();
    }

    setDeliveryColumns(deliveryColumns: string[]) {
        this.deliveryColumns = Array.from(deliveryColumns);
        this.update();
    }

    setShowType(showType: ShowType) {
        this.showType = showType;
        this.update();
    }

    update() {
        const properties = Utils.getTableProperties(this.mode, this.stationColumns, this.deliveryColumns);
        const selectColumn: any = {
            name: ' ',
            prop: 'selected',
            resizable: false,
            draggable: false,
            cellTemplate: this.selectTmpl
        };

        this.columns = this.getUpdatedColumns([selectColumn].concat(properties.map(prop => {
            return {
                name: Constants.PROPERTIES.has(prop) ? Constants.PROPERTIES.get(prop).name : '"' + prop + '"',
                prop: prop,
                resizeable: false,
                draggable: false
            };
        })));

        if (this.data != null) {
            let elements: (StationData | DeliveryData)[] = [];

            if (this.mode === TableMode.STATIONS) {
                elements = this.data.stations.filter(s => !s.invisible && !s.contained);
            } else if (this.mode === TableMode.DELIVERIES) {
                elements = this.data.deliveries.filter(d => !d.invisible);
            }

            if (this.showType === ShowType.SELECTED_ONLY) {
                elements = elements.filter(e => e.selected);
            } else if (this.showType === ShowType.TRACE_ONLY) {
                elements = elements.filter(e => e.forward || e.backward || e.observed !== ObservedType.NONE);
            }

            const propertySet = new Set(properties);

            this.unfilteredRows = elements.map(e => {
                const copy = JSON.parse(JSON.stringify(e));
                let stringContent = '';

                for (const key of Object.keys(e)) {
                    if (propertySet.has(key)) {
                        stringContent += String(e[key]).trim().toLowerCase() + ' ';
                    }
                }

                for (const prop of e.properties) {
                    if (propertySet.has(prop.name)) {
                        copy[prop.name] = prop.value;
                        stringContent += prop.value.trim().toLowerCase() + ' ';
                    }
                }

                return {
                    content: copy,
                    stringContent: stringContent.trim()
                };
            });

            this.rows = TableComponent.filterRows(this.unfilteredRows, this.filter);
        } else {
            this.unfilteredRows = [];
            this.rows = [];
        }

        this.table.recalculate();
    }

    onSelectionChange(changeFunction: () => void) {
        this.changeFunction = changeFunction;
    }

    onFilterChange() {
        this.rows = TableComponent.filterRows(this.unfilteredRows, this.filter);
        this.table.recalculatePages();
    }

  //noinspection JSMethodCanBeStatic
    getRowClass(row) {
        return {
            'selected': row.selected,
            'forward': row.forward,
            'backward': row.backward,
            'observed': row.observed !== ObservedType.NONE,
            'outbreak': row.outbreak,
            'crossContamination': row.crossContamination,
            'commonLink': row.commonLink
        };
    }

    onSelect(row) {
        if (this.mode === TableMode.STATIONS) {
            this.data.stations.find(s => s.id === row.id).selected = row.selected;
        } else if (this.mode === TableMode.DELIVERIES) {
            this.data.deliveries.find(d => d.id === row.id).selected = row.selected;
        }

        if (this.showType === ShowType.SELECTED_ONLY && !row.selected) {
            this.rows.splice(this.rows.findIndex(r => r.id === row.id), 1);
        }

        if (this.changeFunction != null) {
            this.changeFunction();
        }
    }

    onSelectAll() {
        this.rows.forEach(r => r.selected = true);

        const ids: Set<string> = new Set(this.rows.map(r => r.id));
        let changed = false;

        for (const element of Utils.getTableElements(this.mode, this.data)) {
            if (ids.has(element.id)) {
                if (!element.selected) {
                    changed = true;
                }

                element.selected = true;
            }
        }

        if (changed && this.changeFunction != null) {
            this.changeFunction();
        }
    }

    private getUpdatedColumns(columns: any[]): any[] {
        const selectColumnWidth = 40;
        const width = (this.container.nativeElement as HTMLElement).offsetWidth - this.scrollbarHelper.width;
        const columnWidth = (width - selectColumnWidth) / (columns.length - 1);
        let first = true;

        for (const column of columns) {
            const w = first ? selectColumnWidth : columnWidth;

            column.width = w;
            column.minWidth = w;
            column.maxWidth = w;
            first = false;
        }

        return columns;
    }
}