import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatDialog, MatSidenav } from '@angular/material';
import { Router } from '@angular/router';
import * as _ from 'lodash';

import { GraphComponent } from '../../graph/graph.component';
import { TableComponent } from '../../table/table.component';
import { DataService } from '../../services/data.service';
import { generateVisioReport } from '../../visio/visio.service';
import { Utils } from '../../util/utils';
import { FclData, GraphType } from '../../util/datatypes';
import { Constants } from '../../util/constants';
import { GisComponent } from '../../gis/gis.component';
import { environment } from '../../../../environments/environment';
import { MainPageService } from '../../../main-page/services/main-page.service';
import { NodeLayoutInfo } from '../../visio/layout-engine/datatypes';
import { Store, select } from '@ngrx/store';
import * as fromTracing from '../../state/tracing.reducers';
import * as tracingActions from '../../state/tracing.actions';
import { takeWhile, tap, catchError } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
    selector: 'fcl-main-tracing',
    templateUrl: './main-tracing.component.html',
    styleUrls: ['./main-tracing.component.scss']
})
export class MainTracingComponent implements OnInit, OnDestroy {
    @ViewChild('graph') graph: GraphComponent;
    @ViewChild('gis') gis: GisComponent;
    @ViewChild('table') table: TableComponent;
    @ViewChild('rightSidenav') rightSidenav: MatSidenav;
    @ViewChild('rightSidenav', { read: ElementRef })
    rightSidenavElement: ElementRef;

    appName: string = environment.appName;
    subscriptions = [];

    graphType = GraphType.GRAPH;
    gisType = GraphType.GIS;
    tableModes = Constants.TABLE_MODES;
    showTypes = Constants.SHOW_TYPES;

    leftOpened: boolean = false;
    rightOpened: boolean = false;
    private componentActive = true;

    data: FclData = {
        elements: null,
        layout: null,
        gisLayout: null,
        graphSettings: DataService.getDefaultGraphSettings(),
        tableSettings: DataService.getDefaultTableSettings()
    };

    constructor(
        private dataService: DataService,
        private dialogService: MatDialog,
        private router: Router,
        private mainPageService: MainPageService,
        private store: Store<fromTracing.State>
    ) {
        document.body.oncontextmenu = e => e.preventDefault();
        this.store.dispatch(new tracingActions.SetTracingActive(true));
    }

    ngOnInit() {
        this.subscriptions.push(
            this.mainPageService.doSaveImage.subscribe(
                () => {
                    this.onSaveImage();
                },
                error => {
                    throw new Error(`error saving image: ${error}`);
                }
            )
        );
        this.subscriptions.push(
            this.mainPageService.doVisioLayout.subscribe(
                () => {
                    this.onVisioLayout();
                },
                error => {
                    throw new Error(`error creating ROA style: ${error}`);
                }
            )
        );
        this.subscriptions.push(
            this.mainPageService.doOnSave.subscribe(
                () => {
                    this.onSave();
                },
                error => {
                    throw new Error(`error saving: ${error}`);
                }
            )
        );

        this.store.pipe(
            select(fromTracing.getFclData),
            takeWhile(() => this.componentActive)
        ).subscribe(
            (data: FclData) => {
                console.log('load data before if!');
                if (data) {
                    console.log('load data in if!');
                    this.data = data;
                    this.updateComponents();
                }
            },
            (error) => {
                throw new Error(`error loading fcl data: ${error}`);
            }
        );

        combineLatest(
            // this.store.pipe(select(fromTracing.getFclData)),
            this.store.pipe(select(fromTracing.getGraphSettingsOption)),
            this.store.pipe(select(fromTracing.getTableSettingsOption)),
            this.store.pipe(select(fromTracing.getSideBarStates))
        )
            .pipe(
                tap(
                    // ([data, graphSettingsOption, tableSettingsOption, sideBarStates]) => {
                    ([graphSettingsOption, tableSettingsOption, sideBarStates]) => {
                        // this.data = data;
                        // this.updateComponents();

                        console.log('MainTracingComponent ngOnInit, combineLatest received');

                        this.onGraphChange(graphSettingsOption);
                        this.onTableChange(tableSettingsOption);
                        this.leftOpened = sideBarStates.leftSideBarOpen;
                        this.rightOpened = sideBarStates.rightSideBarOpen;

                        // this.updateComponents();
                    },
                    catchError(error => {
                        throw new Error(`error with tracing options: ${error}`);
                    })
                ),
                takeWhile(() => this.componentActive)
            )
            .subscribe();
    }

    onHome() {
        this.router.navigate(['/']).catch(err => {
            throw new Error(`Unable to navigate: ${err}`);
        });
    }

    onGraphChange(property: string) {
        switch (property) {
            case 'type':
                switch (this.data.graphSettings.type) {
                    case GraphType.GRAPH:
                        this.data.gisLayout = this.gis.getLayout();
                        break;
                    case GraphType.GIS:
                        this.data.layout = this.graph.getLayout();
                        break;
                }

                this.updateComponents();
                break;
            case 'nodeSize':
                this.getCurrentGraph().setNodeSize(this.data.graphSettings.nodeSize);
                break;
            case 'fontSize':
                this.getCurrentGraph().setFontSize(this.data.graphSettings.fontSize);
                break;
            case 'mergeDeliveries':
                this.getCurrentGraph().setMergeDeliveries(this.data.graphSettings.mergeDeliveries);
                break;
            case 'showLegend':
                this.getCurrentGraph().setShowLegend(this.data.graphSettings.showLegend);
                break;
            case 'showZoom':
                this.getCurrentGraph().setShowZoom(this.data.graphSettings.showZoom);
                break;
        }
    }

    onTableChange(property: string) {
        switch (property) {
            case 'width':
                (this.rightSidenavElement.nativeElement as HTMLElement).style.width = this.data.tableSettings.width * 100 + '%';
                break;
            case 'mode':
                this.table.setMode(this.data.tableSettings.mode);
                break;
            case 'stationColumns':
                this.table.setStationColumns(this.data.tableSettings.stationColumns);
                break;
            case 'deliveryColumns':
                this.table.setDeliveryColumns(this.data.tableSettings.deliveryColumns);
                break;
            case 'showType':
                this.table.setShowType(this.data.tableSettings.showType);
                break;
        }
    }

    onSave() {
        switch (this.data.graphSettings.type) {
            case GraphType.GRAPH:
                this.data.layout = this.graph.getLayout();
                break;
            case GraphType.GIS:
                this.data.gisLayout = this.gis.getLayout();
                break;
        }

        const data: any = this.dataService.getExportData();
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        // const blob = new Blob([JSON.stringify(this.data)], {type: 'application/json'});
        const fileName = 'data.json';

        if (window.navigator.msSaveOrOpenBlob != null) {
            window.navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
            const url = window.URL.createObjectURL(blob);

            Utils.openSaveDialog(url, fileName);
            window.URL.revokeObjectURL(url);
        }
    }

    onSaveImage() {
        this.getCurrentGraph()
            .getCanvas()
            .then(canvas => {
                const fileName = 'graph.png';

                if (window.navigator.msSaveOrOpenBlob != null && canvas.msToBlob != null) {
                    window.navigator.msSaveOrOpenBlob(canvas.msToBlob(), fileName);
                } else {
                    Utils.openSaveDialog(canvas.toDataURL('image/png'), fileName);
                }
            })
            .catch(err => {
                throw new Error(`Unable to save image: ${err}`);
            });
    }

    getNodeLayoutInfo(): Map<string, NodeLayoutInfo> {
        // refactor
        const view = this.graphType === GraphType.GRAPH ? this.graph : this.gis;

        if (view !== null && view.hasOwnProperty('cy') && (view as any).cy !== null) {
            const result: Map<string, { size: number; position: { x: number; y: number } }> = new Map();

            for (const node of (view as any).cy.nodes()) {
                const position = node.data().position;
                result.set(node.id(), {
                    size: node.height(),
                    position: {
                        x: position.x,
                        y: position.y
                    }
                });
            }
            return result;
        } else {
            return null;
        }
    }

    onVisioLayout() {
        const nodeLayoutInfo = this.getNodeLayoutInfo();

        if (nodeLayoutInfo !== null) {
            generateVisioReport(this.data.elements, nodeLayoutInfo, this.dialogService)
                .then(visioReport => {
                    if (visioReport !== null) {
                        this.router.navigate(['/graph-editor']).catch(err => {
                            throw new Error(`Unable to navigate to graph editor: ${err}`);
                        });
                        this.store.dispatch(new tracingActions.GenerateVisioLayoutSuccess(visioReport));
                    }
                })
                .catch(err => {
                    if (err !== undefined) {
                        throw new Error(`Visio layout creation failed: ${err}`);
                    }
                });
        }
    }

    ngOnDestroy() {
        console.log('MainTracingComponent, ngOnDestroy, this.data: ', this.data);
        this.store.dispatch(new tracingActions.LoadFclDataSuccess(this.data));
        this.store.dispatch(new tracingActions.SetTracingActive(false));
        _.forEach(this.subscriptions, subscription => {
            subscription.unsubscribe();
        });

        this.componentActive = false;
    }

    private updateComponents() {
        this.onTableChange('width');

        const waitForGraph = () => {
            if (this.getCurrentGraph().elementRef.nativeElement.offsetParent == null) {
                setTimeout(waitForGraph, 50);
            } else {
                this.getCurrentGraph().setNodeSize(this.data.graphSettings.nodeSize);
                this.getCurrentGraph().setFontSize(this.data.graphSettings.fontSize);
                this.getCurrentGraph().setMergeDeliveries(this.data.graphSettings.mergeDeliveries);
                this.getCurrentGraph().setShowLegend(this.data.graphSettings.showLegend);
                this.getCurrentGraph().setShowZoom(this.data.graphSettings.showZoom);
                this.getCurrentGraph().onChange(() => this.table.update());

                switch (this.data.graphSettings.type) {
                    case GraphType.GRAPH:
                        this.graph.init(this.data.elements, this.data.layout);
                        break;
                    case GraphType.GIS:
                        this.gis.init(this.data.elements, this.data.gisLayout);
                        break;
                }

                this.table.setMode(this.data.tableSettings.mode);
                this.table.setStationColumns(this.data.tableSettings.stationColumns);
                this.table.setDeliveryColumns(this.data.tableSettings.deliveryColumns);
                this.table.setShowType(this.data.tableSettings.showType);
                this.table.onSelectionChange(() => this.getCurrentGraph().updateSelection());
                this.table.init(this.data.elements);
            }
        };

        waitForGraph();
    }

    private getCurrentGraph(): GraphComponent | GisComponent {
        switch (this.data.graphSettings.type) {
            case GraphType.GRAPH:
                return this.graph;
            case GraphType.GIS:
                return this.gis;
        }
    }
}
