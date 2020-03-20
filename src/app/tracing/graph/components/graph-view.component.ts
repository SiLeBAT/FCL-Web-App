import { Component, ElementRef, OnInit, ViewChild, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import * as Hammer from 'hammerjs';
import cytoscape from 'cytoscape';
import { ResizeSensor } from 'css-element-queries';
import { Utils as UIUtils } from '../../util/ui-utils';
import { Utils as NonUIUtils, Utils } from '../../util/non-ui-utils';
import {
    Layout,
    Position,
    Size,
    GraphState,
    MergeDeliveriesType,
    SelectedElements
} from '../../data.model';
import * as _ from 'lodash';
import { StyleService } from '../style.service';
import { Cy, CyNodeDef, CyEdgeDef, GraphServiceData } from '../graph.model';
import { EdgeLabelOffsetUpdater } from '../edge-label-offset-updater';

interface GraphSettingsState {
    fontSize: Size;
    nodeSize: Size;
    mergeDeliveriesType: MergeDeliveriesType;
    showMergedDeliveriesCounts: boolean;
}

interface GisGraphState extends GraphState, GraphSettingsState {
    layout: Layout;
}

interface NodePositions {
    [key: string]: Position;
}

interface GraphConfig {
    graphData: GraphServiceData;
    fontSize: number;
    nodeSize: number;
    nodePositions: NodePositions;
    layout: Layout;
}

interface GraphChanges {
    selection?: SelectedElements;
    nodePositions?: NodePositions;
    layout?: Layout;
    pan?: Position;
}

@Component({
    selector: 'fcl-graph-view',
    templateUrl: './graph-view.component.html',
    styleUrls: ['./graph-view.component.scss']
})
export class GraphViewComponent implements OnInit, OnDestroy {
    private static readonly MIN_ZOOM = 0.1;
    private static readonly MAX_ZOOM = 100.0;
    private static readonly ZOOM_FACTOR = 1.5;
    private static readonly ZOOM_PADDING = 4;


    private _graphConfig: GraphConfig;
    // @Input() nodeSize: number;
    // @Input() fontSize: number;
    @Input() hoverDeliveries: string[];
    // @Input() nodePositions: NodePositions;
    // @Input() graphData: GraphServiceData;
    @Input()
        set graphConfig(graphConfig: GraphConfig) {
            if (this._graphConfig !== graphConfig) {
                this.applyGraphConfig(graphConfig);
            }
        }



    // @Output() zoomPercentage = new EventEmitter<number>();
    private zoomPercentage: number;
    // @Output() nodeDragEnd = new EventEmitter();
    // @Output() pan = new EventEmitter();
    // @Output() panEnd = new EventEmitter();
    // @Output() selectionChangedByUser = new EventEmitter();
    // @Output() layoutFinished = new EventEmitter();
    // @Output() layoutStopped = new EventEmitter();
    @Output() error = new EventEmitter<string>();
    @Output() graphEvent = new EventEmitter<GraphChanges>();


    @ViewChild('container', { static: true }) containerElement: ElementRef;
    @ViewChild('graph', { static: true }) graphElement: ElementRef;

    private componentIsActive = false;

    private zoom: number;

    private cy: Cy;

    private selectionTimerSubscription: Subscription;

    private isPanning = false;

    private edgeLabelOffsetUpdater = new EdgeLabelOffsetUpdater();
    private windowResizeListener: () => void;
    private containerResizeListener: () => void;
    private isTriggerActive: boolean = false;
    private triggerResize: () => void;

    private containerResizeSensor: ResizeSensor;

    private virtNodePositions: NodePositions;

    constructor(
        public elementRef: ElementRef,
        private styleService: StyleService
    ) {
        this.initResizeTriggerFun();
    }

    private initResizeTriggerFun(): void {
        this.triggerResize = () => {
            if (this.isTriggerActive) {
                this.isTriggerActive = true;
                setTimeout(() => {
                    this.processResize();
                    this.isTriggerActive = false;
                }, 500);
            }
        };
    }

    private addWindowResizeListener(): void {
        window.addEventListener('resize', this.triggerResize);
    }

    private removeWindowResizeListener(): void {
        window.removeEventListener('resize', this.triggerResize);
    }

    private addContainerResizeListener(): void {
        this.containerResizeSensor = new ResizeSensor(this.containerElement.nativeElement, this.triggerResize);
    }

    private removeContainerResizeListener(): void {
        if (this.containerResizeSensor) {
            this.containerResizeSensor.detach(this.triggerResize);
            this.containerResizeSensor = null;
        }
    }

    private processResize(): void {
        if (this.cy) {
            this.cy.resize();
        }
    }

    ngOnInit() {
        this.addWindowResizeListener();
        this.addContainerResizeListener();

        this.componentIsActive = true;
    }

    ngOnDestroy() {
        this.componentIsActive = false;
        this.removeContainerResizeListener();
        this.removeWindowResizeListener();
        if (this.selectionTimerSubscription) {
            this.selectionTimerSubscription.unsubscribe();
            this.selectionTimerSubscription = null;
        }
        this.cleanCy();
    }

    private _hoverDeliveries(deliveryIds: string[]): void {
        const edgeIds = NonUIUtils.createStringSet(
            deliveryIds
                .map(id => this.cachedData.delIdToEdgeDataMap[id])
                .filter(data => !!data)
                .map(data => data.id)
        );

        this.cy.batch(() => {
            this.cy
                .edges()
                .filter(e => !edgeIds[e.id()])
                .scratch('_active', false);
            this.cy
                .edges()
                .filter(e => !!edgeIds[e.id()])
                .scratch('_active', true);
        });
    }

    private cleanCy(): void {
        if (this.cy) {
            this.edgeLabelOffsetUpdater.disconnect();
            this.cy.destroy();
            this.cy = null;
        }
    }

    private addCustomZoomControl(): void {
        const hammer = new Hammer.Manager(
            this.cy
                .container()
                .children.item(0)
                .children.item(0),
            { recognizers: [[Hammer.Pinch]] }
        );
        let pinchCenter: Position;
        let pinchScale: number;

        hammer.on('pinchstart', e => {
            this.cy.userPanningEnabled(false);

            const cyRect = this.cy.container().getBoundingClientRect();

            pinchCenter = {
                x: e.center.x - cyRect.left,
                y: e.center.y - cyRect.top
            };
            pinchScale = e.scale;
        });
        hammer.on('pinchin pinchout', e => {
            this.zoomTo((this.zoom * e.scale) / pinchScale, pinchCenter.x, pinchCenter.y);
            pinchScale = e.scale;
        });
        hammer.on('pinchend pinchcancel', () => {
            pinchCenter = null;
            pinchScale = null;
            this.cy.userPanningEnabled(true);
        });
        this.cy
            .container()
            .children.item(0)
            .children.item(0)
            .addEventListener(
                'wheel',
                (e: WheelEvent) => {
                    this.zoomTo(
                        this.zoom * Math.pow(10, e.deltaMode === 1 ? e.deltaY / -25 : e.deltaY / -250),
                        e.offsetX,
                        e.offsetY
                    );
                },
                false
            );
    }

    private addCyListeners(): void {
        this.cy.on('pan', () => {
            this.isPanning = true;
            // this.pan.emit();
            this.graphEvent.emit({ pan: null });
            // this.updateMap();
        });

        this.cy.on('tapstart', () => (this.isPanning = false));

        this.cy.on('tapend', () => {
            if (this.isPanning) {
                // this.panEnd.emit();
                this.graphEvent.emit({ layout: null });
                // this.applyLayoutToStateIfNecessary();
            }
        });

        // nodes move
        this.cy.on('dragfreeon', () => {
            // this.nodeDragEnd.emit();
            this.graphEvent.emit({ nodePositions: null });
            // this.applyNodePositionsToState();
        });

        // click un/selection
        this.cy.on('tapselect', event => this.processGraphElementSelectionChange());
        this.cy.on('tapunselect', event => this.processGraphElementSelectionChange());

        // box selection
        this.cy.on('boxselect', event => this.processGraphElementSelectionChange());

    }

    private getDefaultLayoutOption(nodeCount: number): any {
        return nodeCount > 100 ?
            {
                name: LayoutManagerInfo.fruchtermanReingold.name
            } :
            {
                name: LayoutManagerInfo.farmToFork.name, timelimit: 10000
            };
    }

    private initCy(graphConfig: GraphConfig) {
        // if layout is provided take it,
        // otherwise if the node positions are given take the fit layout
        // otherwise let the layout be undefined
        const layout = (
            graphConfig.layout ?
            graphConfig.layout : (
                graphConfig.nodePositions ? this.getFitLayout(graphConfig) : null
             )
        ) ;

        const nodesDefs = this.createNodes(layout, graphConfig.graphData);

        this.zoom = layout.zoom;

        this.cleanCy();
        this.cy = cytoscape({
            container: this.graphElement.nativeElement,
            elements: {
                nodes: nodesDefs,
                edges: this.createEdges(graphConfig.graphData)
            },
            // layout: { name: 'preset', zoom: 1, pan: layout.pan },
            // use either layout
            layout: (
                layout ?
                { name: 'preset', zoom: 1, pan: layout.pan } :
                this.getDefaultLayoutOption(nodesDefs.length)
            ),
            style: this.styleService.createCyStyle(
                {
                    fontSize: graphConfig.fontSize,
                    nodeSize: graphConfig.nodeSize,
                    zoom: 1
                },
                graphConfig.graphData
            ),
            zoomingEnabled: false,
            autoungrabify: true,
            wheelSensitivity: 0.5
        });

        this.addCustomZoomControl();

        this.addCyListeners();

        // this.contextMenu.connect(this.cy, this.hoverDeliveriesSubject);

        // this.updateZoomPercentage();

        // this.resizeGraphAndMap();
        this.processResize();

        // this.applyLayoutToStateIfNecessary();

        this.edgeLabelOffsetUpdater.connectTo(this.cy);
    }

    private triggerInitCy(graphConfig: GraphConfig) {
        const sub = timer(0).subscribe(
            () => {
                this.initCy(graphConfig);
            },
            err => this.error.emit(`Cy graph could not be initialized: ${err}`)
        );
    }

    private processGraphElementSelectionChange() {
        if (!this.selectionTimerSubscription) {
            this.selectionTimerSubscription = timer(0).subscribe(
                () => {
                    this.selectionTimerSubscription.unsubscribe();
                    // this.selectionChangedByUser.emit(this.getSelectedElements());
                    this.graphEvent.emit({ selection: this.getSelectedElements() });
                    // this.applyElementSelectionToState();
                    this.edgeLabelOffsetUpdater.update(true);
                    this.selectionTimerSubscription = null;
                },
                error => this.error.emit(`${error}`)
            );
        }
    }

    private getSelectedElements(): SelectedElements {
        const selectedNodes = this.cy.nodes(':selected');
        const selectedEdges = this.cy.edges(':selected');

        return {
            stations: selectedNodes.map(node => node.data().station.id),
            deliveries: [].concat(
                ...selectedEdges.map(edge =>
                    edge.data().selected
                        ? edge
                                .data()
                                .deliveries.filter(d => d.selected)
                                .map(d => d.id)
                        : edge.data().deliveries.map(d => d.id)
                )
            )
        };
    }

    private createNodes(graphConfig: GraphConfig): CyNodeDef[] {
        const virtPositions = this.convertToVirtualNodePositions(graphConfig.nodePositions, graphConfig.layout.zoom);
        const result = graphConfig.graphData.nodeData.map(nodeData => ({
            group: 'nodes',
            data: nodeData,
            selected: nodeData.selected,
            position: virtPositions[nodeData.id]
        }));

        return result;
    }

    private createEdges(graphData: GraphServiceData): CyEdgeDef[] {
        return graphData.edgeData.map(edgeData => ({
            group: 'edges',
            data: edgeData,
            selected: edgeData.selected
        }));
    }

    private updateGraphEdges(graphConfig: GraphConfig) {
        this.cy.batch(() => {
            this.cy.edges().remove();
            this.cy.add(this.createEdges(graphConfig.graphData));
        });
        this.edgeLabelOffsetUpdater.update(true);
    }

    private updateGraph(graphConfig: GraphConfig) {
        this.cy.batch(() => {
            this.cy.elements().remove();
            this.cy.add(this.createNodes(graphConfig));
            this.cy.add(this.createEdges(graphConfig.graphData));
            this.updateGraphStyle(graphConfig);
        });
        // this.updateMap();
        this.edgeLabelOffsetUpdater.update(true);
    }

    private updateGraphStyle(graphConfig: GraphConfig) {
        if (this.cy && this.cy.style) {
            this.cy.setStyle(
                this.styleService.createCyStyle(
                    {
                        fontSize: graphConfig.fontSize,
                        nodeSize: graphConfig.nodeSize,
                        zoom: 1
                    },
                    graphConfig.graphData
                )
            );
            this.cy.elements().scratch('_update', true);
            this.edgeLabelOffsetUpdater.update(true);
        }
    }

    private updateGraphSelection() {
        if (this.cy != null) {
            this.cy.batch(() => {
                this.cy.elements(':selected[!selected]').unselect();
                this.cy.elements(':unselected[?selected]').select();
                this.cy.elements().scratch('_update', true);
            });
        }
    }

    private zoomTo(newZoom: number, zx: number, zy: number) {
        newZoom = Math.min(Math.max(newZoom, GraphViewComponent.MIN_ZOOM), GraphViewComponent.MAX_ZOOM);
        const newPan = {
            x: zx + ((this.cy.pan().x - zx) * newZoom) / this.zoom,
            y: zy + ((this.cy.pan().y - zy) * newZoom) / this.zoom
        };
        const oldPan = this.cy.pan();
        if (newZoom !== this.zoom || newPan.x !== oldPan.x || newPan.y !== oldPan.y) {
            this.applyGraphLayout({
                zoom: newZoom,
                pan: newPan
            });
        }
    }

    private getZoomedPositions(nodePositions: NodePositions, zoomFactor: number): NodePositions {
        const zoomedNodePositions: NodePositions = {};
        Object.entries(nodePositions).forEach(([nodeId, nodePos]) => {
            zoomedNodePositions[nodeId] = { x: nodePos.x * zoomFactor, y: nodePos.y * zoomFactor };
        });
        return zoomedNodePositions;
    }

    private convertToVirtualNodePositions(nodePositions: NodePositions, zoom: number): NodePositions {
        return this.getZoomedPositions(nodePositions, zoom);
    }

    private convertFromVirtualNodePositions(nodePositions: NodePositions, zoom: number): NodePositions {
        return this.getZoomedPositions(nodePositions, 1.0 / zoom);
    }

    private applyGraphLayout(layout: Layout) {
        this.zoom = layout.zoom;
        this.virtNodePositions = this.convertToVirtualNodePositions(this.nodePositions, this.zoom);
        this.cy.batch(() => {
            this.cy.pan(layout.pan);
            this.cy.nodes().positions(node => this.virtNodePositions[node.id()]);
        });
        // this.map.setView(UIUtils.panZoomToView(layout.pan, this.zoom, this.cy.width(), this.cy.height()));
        // this.applyLayoutToStateIfNecessary();
        this.updateZoomPercentage();
    }

    private updateZoomPercentage() {
        this.zoomPercentage = Math.round(
            (Math.log(this.zoom / GraphViewComponent.MIN_ZOOM) / Math.log(GraphViewComponent.MAX_ZOOM / GraphViewComponent.MIN_ZOOM)) * 100
        );
    }

    private getFitLayout(graphConfig: GraphConfig): Layout {
        const width = this.containerElement.nativeElement.offsetWidth;
        const height = this.containerElement.nativeElement.offsetHeight;
        const border = this.nodeSize; //GraphViewComponent.NODE_SIZES.get(this.nodeSize);

        let xMin = Number.POSITIVE_INFINITY;
        let yMin = Number.POSITIVE_INFINITY;
        let xMax = Number.NEGATIVE_INFINITY;
        let yMax = Number.NEGATIVE_INFINITY;

        let zoom: number;
        let pan: Position;

        for (const pos of nodePositions.values()) {
            const p: Position = pos;

            xMin = Math.min(xMin, p.x);
            yMin = Math.min(yMin, p.y);
            xMax = Math.max(xMax, p.x);
            yMax = Math.max(yMax, p.y);
        }

        if (xMax > xMin && yMax > yMin) {
            zoom = Math.min(
                (width - 2 * border) / (xMax - xMin),
                (height - 2 * border) / (yMax - yMin)
            ) * 0.8;
        } else {
            zoom = 1;
        }

        if (Number.isFinite(xMin) && Number.isFinite(yMin) && Number.isFinite(xMax) && Number.isFinite(yMax)) {
            const panX1 = -xMin * zoom + border;
            const panY1 = -yMin * zoom + border;
            const panX2 = -xMax * zoom + width - border;
            const panY2 = -yMax * zoom + height - border;

            pan = { x: (panX1 + panX2) / 2, y: (panY1 + panY2) / 2 };
        } else {
            pan = { x: 0, y: 0 };
        }

        return { zoom: zoom, pan: pan };
    }

    private updateEdgeLabels() {
        if (this.cy && this.cy.style) {
            this.cy.edges().scratch('_update', true);
        }
    }

    private applyGraphConfig(newGraphConfig: GraphConfig) {
        if (!newGraphConfig.layout || !newGraphConfig.nodePositions) {
            // new model
            this.initCy(newGraphConfig);
        } else if (this._graphConfig.graphData.nodeData !== newGraphConfig.graphData.nodeData) {
            // nodes changed
            this.updateGraph(newGraphConfig);
        } else if (this._graphConfig.graphData.edgeData !== newGraphConfig.graphData.edgeData) {
            // edges changed
            this.updateGraphEdges(newGraphConfig);
        } else if (this._graphConfig.graphData.propsChangedFlag !== newGraphConfig.graphData.propsChangedFlag) {
            // element style might have changed
            this.updateGraphStyle(newGraphConfig);
        } else if (
            !this.selectionTimerSubscription &&
            (
                this._graphConfig.graphData.nodeSel !== newGraphConfig.graphData.nodeSel ||
                this._graphConfig.graphData.edgeSel !== newGraphConfig.graphData.edgeSel
            )
        ) {
            this.updateGraphSelection(newGraphConfig);
        } else if (this._graphConfig.nodeSize !== newGraphConfig.nodeSize) {
            this.updateGraphStyle(newGraphConfig);
        } else if (this._graphConfig.fontSize !== newGraphConfig.fontSize) {
            this.updateGraphStyle(newGraphConfig);
        } else if (this._graphConfig.graphData.edgeLabelChangedFlag !== newGraphConfig.graphData.edgeLabelChangedFlag) {
            this.updateEdgeLabels();
        }
        this._graphConfig = newGraphConfig;
    }
}
