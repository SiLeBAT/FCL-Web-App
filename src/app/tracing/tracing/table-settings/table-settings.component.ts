import { Constants } from './../../util/constants';
import { Component, OnInit, OnDestroy } from '@angular/core';

import { TableSettings, FclData } from './../../util/datatypes';
import { DataService } from '../../services/data.service';
import * as fromTracing from '../../state/tracing.reducers';
import * as tracingActions from '../../state/tracing.actions';
import { Store, select } from '@ngrx/store';
import { takeWhile } from 'rxjs/operators';
import { Utils } from '../../util/utils';
import { DialogSelectData, DialogSelectComponent } from '../../dialog/dialog-select/dialog-select.component';
import { MatDialog } from '@angular/material';

@Component({
    selector: 'fcl-table-settings',
    templateUrl: './table-settings.component.html',
    styleUrls: ['./table-settings.component.scss']
})
export class TableSettingsComponent implements OnInit, OnDestroy {
    tableModes = Constants.TABLE_MODES;
    showTypes = Constants.SHOW_TYPES;
    tableSettings: TableSettings; // = DataService.getDefaultTableSettings();
    private componentActive: boolean = true;
    private data: FclData;

    constructor(private store: Store<fromTracing.State>,
        private dialogService: MatDialog) { }

    ngOnInit() {
        this.store.pipe(
            select(fromTracing.getFclData),
            takeWhile(() => this.componentActive)
        ).subscribe(
            (data: FclData) => {
                this.data = data;
                this.tableSettings = data.tableSettings;
            }, (error => {
                throw new Error(`error loading data: ${error}`);
            })
        );
    }

    setTableMode() {
        this.store.dispatch(new tracingActions.SetTableMode(this.tableSettings.mode));
    }

    setTableShowType() {
        this.store.dispatch(new tracingActions.SetTableShowType(this.tableSettings.showType));
    }

    changeColumns() {
        const options: {
            value: string;
            viewValue: string;
            selected: boolean;
        }[] = [];

        for (const column of Utils.getAllTableProperties(this.data.tableSettings.mode, this.data.elements)) {
            options.push({
                value: column,
                viewValue: Constants.PROPERTIES.has(column) ? Constants.PROPERTIES.get(column).name : '"' + column + '"',
                selected: Utils.getTableProperties(
                    this.data.tableSettings.mode,
                    this.data.tableSettings.stationColumns,
                    this.data.tableSettings.deliveryColumns
                ).includes(column)
            });
        }

        const dialogData: DialogSelectData = {
            title: 'Input',
            options: options
        };

        this.dialogService
            .open(DialogSelectComponent, { data: dialogData })
            .afterClosed()
            .take(1)
            .subscribe((selections: string[]) => {
                if (selections != null) {
                    this.store.dispatch(new tracingActions.SetTableColumns([this.data.tableSettings.mode, selections]));
                }
            }, (error => {
                throw new Error(`error loading dialog or selecting columns: ${error}`);
            }));
    }

    ngOnDestroy() {
        this.componentActive = false;
    }
}
