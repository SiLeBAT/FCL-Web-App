import {
    Component, ElementRef, ViewChild, OnDestroy, Input, Output, AfterViewInit,
    EventEmitter, DoCheck, OnChanges, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';

import { Size, Layout, PositionMap } from '../../../data.model';
import _ from 'lodash';
import { ContextMenuRequestInfo, SelectedGraphElements } from '../../graph.model';
import { StyleConfig } from './cy-style';
import { VirtualZoomCyGraph } from '../../cy-graph/virtual-zoom-cy-graph';
import { GraphEventType, InteractiveCyGraph } from '../../cy-graph/interactive-cy-graph';
import { GraphData } from './cy-graph';

export interface GraphDataChange {
    layout?: Layout;
    nodePositions?: PositionMap;
    selectedElements?: SelectedGraphElements;
}

@Component({
    selector: 'fcl-graph-view',
    templateUrl: './graph-view.component.html',
    styleUrls: ['./graph-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphViewComponent implements OnDestroy, AfterViewInit, DoCheck, OnChanges {

    private static readonly MIN_ZOOM = 0.1;
    private static readonly MAX_ZOOM = 100.0;

    private ngAfterViewInitPassed = false;
    private inputProcessed = true;
    private cyGraph_: InteractiveCyGraph = null;

    @ViewChild('graph', { static: true }) graphElement: ElementRef;

    @Input() graphData: GraphData;
    @Input() styleConfig: StyleConfig;

    @Input() showZoom: boolean;

    @Output() graphDataChange = new EventEmitter<GraphDataChange>();
    @Output() contextMenuRequest = new EventEmitter<ContextMenuRequestInfo>();

    get zoomPercentage(): number | undefined {
        return this.cyGraph_ ? this.cyGraph_.zoomPercentage : undefined;
    }

    constructor(public elementRef: ElementRef) {}

    /** --- life cycle hooks */

    ngOnChanges(changes: SimpleChanges) {
        this.inputProcessed = false;
        // console.log('Graph-View.ngOnChanges: ');
        // console.log(changes);
    }

    ngDoCheck(): void {
        if (!this.inputProcessed) {
            this.processInputDataUpdate();
        }
    }

    ngAfterViewInit(): void {
        this.ngAfterViewInitPassed = true;
    }

    ngOnDestroy() {
        this.cleanCyGraph();
    }

    private cleanCyGraph(): void {
        if (this.cyGraph_) {
            this.cyGraph_.destroy();
            this.cyGraph_ = null;
        }
    }

    onZoomIn(): void {
        if (this.cyGraph_) {
            this.cyGraph_.zoomIn();
        }
    }

    onZoomOut(): void {
        if (this.cyGraph_) {
            this.cyGraph_.zoomOut();
        }
    }

    onZoomFit(): void {
        if (this.cyGraph_) {
            this.cyGraph_.zoomFit();
        }
    }

    onZoomSlide(value: string): void {
        if (this.cyGraph_) {
            this.cyGraph_.zoomPercentage = Number(value);
        }
    }

    onComponentResized(): void {
        if (this.cyGraph_ && this.isSizePositive()) {
            this.cyGraph_.updateSize();
        }
    }

    private isSizePositive(): boolean {
        const size = this.getSize();
        return size.width > 0 && size.height > 0;
    }

    private getSize(): Size {
        const size: Size = this.elementRef.nativeElement.getBoundingClientRect();
        return {
            width: size.width,
            height: size.height
        };
    }

    private onGraphDataChange(): void {
        // console.log('Graph-View.onGraphDataChange entered ...');
        this.graphDataChange.emit({
            layout:
                this.graphData.layout !== this.cyGraph_.layout ?
                this.cyGraph_.layout :
                undefined
            ,
            nodePositions:
                this.graphData.nodePositions !== this.cyGraph_.nodePositions ?
                this.cyGraph_.nodePositions :
                undefined
            ,
            selectedElements:
                this.graphData.selectedElements !== this.cyGraph_.selectedElements ?
                this.cyGraph_.selectedElements :
                undefined
        });
        // console.log('Graph-View.onGraphDataChange leaving ...');
    }

    private onContextMenuRequest(info: ContextMenuRequestInfo): void {
        // console.log('GraphView.onContextMenuRequest entered ...');
        this.contextMenuRequest.emit(info);
        // console.log('GraphView.onContextMenuRequest leaving ...');
    }

    private createCyGraph(): void {
        this.cyGraph_ = new VirtualZoomCyGraph(
            this.graphElement.nativeElement,
            this.graphData,
            this.styleConfig,
            {
                minZoom: GraphViewComponent.MIN_ZOOM,
                maxZoom: GraphViewComponent.MAX_ZOOM,
                autoungrabify: true,
                defaultLayout: {
                    zoom: 2,
                    pan: { x: 0, y: 0 }
                }
            }
        );
        this.cyGraph_.registerListener(GraphEventType.LAYOUT_CHANGE, () => this.onGraphDataChange());
        this.cyGraph_.registerListener(GraphEventType.SELECTION_CHANGE, () => this.onGraphDataChange());
        this.cyGraph_.registerListener(
            GraphEventType.CONTEXT_MENU_REQUEST,
            (info: ContextMenuRequestInfo) => this.onContextMenuRequest(info)
        );

        if (this.graphData !== this.cyGraph_.data) {
            setTimeout(() => this.onGraphDataChange(), 0);
        }
    }

    private processInputDataUpdate(): void {
        // console.log('GraphView.processInputDataUpdate entered ...');
        if (this.ngAfterViewInitPassed) {
            if (!this.inputProcessed) {
                if (this.graphData && this.styleConfig) {
                    if (this.cyGraph_ && !this.graphData.layout) {
                        this.cleanCyGraph();
                    }
                    if (!this.cyGraph_) {
                        this.createCyGraph();
                    } else if (this.graphData !== this.cyGraph_.data || this.styleConfig !== this.cyGraph_.style) {
                        this.cyGraph_.updateGraph(this.graphData, this.styleConfig);
                    }
                } else if (this.cyGraph_) {
                    this.cleanCyGraph();
                }
                this.inputProcessed = true;
            }
        }
        // console.log('GraphView.processInputDataUpdate leaving ...');
    }
}