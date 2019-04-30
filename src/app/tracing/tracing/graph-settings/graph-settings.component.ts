import { GraphSettings } from './../../util/datatypes';
import { Component, OnInit, OnDestroy } from '@angular/core';

import { Constants } from '../../util/constants';
import { DataService } from '../../services/data.service';
import * as fromTracing from '../../state/tracing.reducers';
import * as tracingActions from '../../state/tracing.actions';
import { Store, select } from '@ngrx/store';
import { takeWhile } from 'rxjs/operators';
import { FclData } from '../../util/datatypes';

@Component({
    selector: 'fcl-graph-settings',
    templateUrl: './graph-settings.component.html',
    styleUrls: ['./graph-settings.component.scss']
})
export class GraphSettingsComponent implements OnInit, OnDestroy {
    graphTypes = Constants.GRAPH_TYPES;
    graphSettings: GraphSettings; // = DataService.getDefaultGraphSettings();
    sizes = Constants.SIZES;
    private componentActive: boolean = true;

    constructor(private store: Store<fromTracing.State>) {}

    ngOnInit() {
        this.store
            .pipe(
                select(fromTracing.getFclData),
                takeWhile(() => this.componentActive)
            )
            .subscribe(
                (data: FclData) => {
                    this.graphSettings = data.graphSettings;
                },
                error => {
                    throw new Error(`error loading data: ${error}`);
                }
            );
    }

    setGraphType() {
        this.store.dispatch(new tracingActions.SetGraphType(this.graphSettings.type));
    }

    setNodeSize() {
        this.store.dispatch(new tracingActions.SetNodeSize(this.graphSettings.nodeSize));
    }

    setFontSize() {
        this.store.dispatch(new tracingActions.SetFontSize(this.graphSettings.fontSize));
    }

    mergeDeliveries() {
        this.store.dispatch(new tracingActions.MergeDeliveries(this.graphSettings.mergeDeliveries));
    }

    showLegend() {
        this.store.dispatch(new tracingActions.ShowLegend(this.graphSettings.showLegend));
    }

    showZoom() {
        this.store.dispatch(new tracingActions.ShowZoom(this.graphSettings.showZoom));
    }

    ngOnDestroy() {
        this.componentActive = false;
    }
}
