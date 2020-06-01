import { TableComponent } from './components/table.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { MainTracingComponent } from './components/main-tracing.component';
import { SharedModule } from '../shared/shared.module';
import { TracingRoutingModule } from './tracing.routing.module';
import { DialogActionsComponent } from './dialog/dialog-actions/dialog-actions.component';
import { DialogAlertComponent } from './dialog/dialog-alert/dialog-alert.component';
import { DialogPromptComponent } from './dialog/dialog-prompt/dialog-prompt.component';
import { DialogSelectComponent } from './dialog/dialog-select/dialog-select.component';
import { DialogSingleSelectComponent } from './dialog/dialog-single-select/dialog-single-select.component';
import { StationPropertiesComponent } from './dialog/station-properties/station-properties.component';
import { DeliveryPropertiesComponent } from './dialog/delivery-properties/delivery-properties.component';
import { DeliveriesPropertiesComponent } from './dialog/deliveries-properties/deliveries-properties.component';

import { STATE_SLICE_NAME, reducer } from './state/tracing.reducers';
import { StoreModule } from '@ngrx/store';
import { GraphSettingsComponent } from './components/graph-settings.component';
import { TableSettingsComponent } from './components/table-settings.component';
import { TracingEffects } from './tracing.effects';
import { GroupingEffects } from './grouping/grouping.effects';
import { IOEffects } from './io/io.effects';
import { VisioEffects } from './visio/visio.effects';
import { EffectsModule } from '@ngrx/effects';
import { NestedMatMenuComponent } from './graph/components/nested-mat-menu.component';
import { SchemaGraphComponent } from './graph/components/schema-graph.component';
import { GraphLegendComponent } from './graph/components/graph-legend.component';
import { NodeSymbolComponent } from './shared/node-symbol/node-symbol.component';
import { ZoomComponent } from './graph/components/zoom.component';
import { GisGraphComponent } from './graph/components/gis-graph.component';
import { GraphContextMenuComponent } from './graph/components/graph-context-menu.component';
import { EdgeSymbolComponent } from './graph/components/edge-symbol.component';
import { KlecksSymbolComponent } from './graph/components/klecks-symbol.component';
import { CreatedImageComponent } from './shared/created-image/created-image.component';
import { MergeStationsDialogComponent } from './grouping/merge-stations-dialog/merge-stations-dialog.component';
import { TabLayoutComponent } from './configuration/tab-layout/tab-layout.component';
import { ConfigurationComponent } from './configuration/configuration/configuration.component';
import { FilterComponent } from './configuration/filter/filter.component';
import { HighlightingComponent } from './configuration/highlighting/highlighting.component';
import { FilterStationComponent } from './configuration/filter-station/filter-station.component';
import { FilterStationLayoutComponent } from './configuration/filter-station-layout/filter-station-layout.component';
import { StandardFilterComponent } from './configuration/standard-filter/standard-filter.component';
import { StandardFilterViewComponent } from './configuration/standard-filter-view/standard-filter-view.component';
import { PredefinedFilterComponent } from './configuration/predefined-filter/predefined-filter.component';
import { PredefinedFilterViewComponent } from './configuration/predefined-filter-view/predefined-filter-view.component';
import { StationTableComponent } from './configuration/station-table/station-table.component';
import { StationTableViewComponent } from './configuration/station-table-view/station-table-view.component';
import { ComplexFilterComponent } from './configuration/complex-filter/complex-filter.component';
import { ComplexFilterViewComponent } from './configuration/complex-filter-view/complex-filter-view.component';
import { ClearAllFilterComponent } from './configuration/clear-all-filter/clear-all-filter.component';
import { ClearAllFilterViewComponent } from './configuration/clear-all-filter-view/clear-all-filter-view.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        NgxDatatableModule,
        TracingRoutingModule,
        StoreModule.forFeature(STATE_SLICE_NAME, reducer),
        EffectsModule.forFeature([TracingEffects, GroupingEffects, IOEffects, VisioEffects])
    ],
    declarations: [
        MainTracingComponent,
        TableComponent,
        DialogActionsComponent,
        DialogAlertComponent,
        DialogPromptComponent,
        DialogSelectComponent,
        DialogSingleSelectComponent,
        StationPropertiesComponent,
        DeliveryPropertiesComponent,
        DeliveriesPropertiesComponent,
        GraphSettingsComponent,
        TableSettingsComponent,
        NestedMatMenuComponent,
        SchemaGraphComponent,
        GisGraphComponent,
        GraphContextMenuComponent,
        GraphLegendComponent,
        NodeSymbolComponent,
        EdgeSymbolComponent,
        KlecksSymbolComponent,
        ZoomComponent,
        CreatedImageComponent,
        MergeStationsDialogComponent,
        TabLayoutComponent,
        ConfigurationComponent,
        FilterComponent,
        HighlightingComponent,
        FilterStationComponent,
        FilterStationLayoutComponent,
        StandardFilterComponent,
        StandardFilterViewComponent,
        PredefinedFilterComponent,
        PredefinedFilterViewComponent,
        StationTableComponent,
        StationTableViewComponent,
        ComplexFilterComponent,
        ComplexFilterViewComponent,
        ClearAllFilterComponent,
        ClearAllFilterViewComponent
    ],
    exports: [
        TableComponent
    ],
    entryComponents: [
        DialogActionsComponent,
        DialogAlertComponent,
        DialogPromptComponent,
        DialogSelectComponent,
        DialogSingleSelectComponent,
        StationPropertiesComponent,
        DeliveryPropertiesComponent,
        DeliveriesPropertiesComponent,
        MergeStationsDialogComponent
    ]
})
export class TracingModule { }
