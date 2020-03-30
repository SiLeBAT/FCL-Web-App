import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Subject, timer, Subscription } from 'rxjs';
import * as Hammer from 'hammerjs';
import * as ol from 'ol';
import cytoscape from 'cytoscape';
import html2canvas from 'html2canvas';
import { ResizeSensor } from 'css-element-queries';
import { Utils as UIUtils } from '../../util/ui-utils';
import { Utils as NonUIUtils } from '../../util/non-ui-utils';
import {
    Layout,
    Position,
    Size,
    GraphState,
    GraphType,
    LegendInfo,
    StationData,
    DeliveryData,
    MergeDeliveriesType,
    MapType,
    ShapeFileData
} from '../../data.model';
import * as _ from 'lodash';
import { StyleService } from '../style.service';
import { Store } from '@ngrx/store';
import * as fromTracing from '@app/tracing/state/tracing.reducers';
import { Cy, CyNodeDef, CyEdgeDef, GraphServiceData } from '../graph.model';
import * as tracingSelectors from '../../state/tracing.selectors';
import { GraphService } from '../graph.service';
import { AlertService } from '@app/shared/services/alert.service';
import { filter } from 'rxjs/operators';
import * as tracingStoreActions from '../../state/tracing.actions';
import { GraphContextMenuComponent } from './graph-context-menu.component';

import { EdgeLabelOffsetUpdater } from '../edge-label-offset-updater';
import { removeFrameLayer, setFrameLayer, createOpenLayerMap, updateMapType } from '@app/tracing/util/map-utils';

interface GraphSettingsState {
    fontSize: Size;
    nodeSize: Size;
    mergeDeliveriesType: MergeDeliveriesType;
    showMergedDeliveriesCounts: boolean;
}

interface GisGraphState extends GraphState, GraphSettingsState {
    layout: Layout;
    mapType: MapType;
    shapeFileData: ShapeFileData;
}

interface GeoCoord {
    lat: number;
    lon: number;
}
interface NoGeoData {
    withoutGeoData: boolean;
    stationsWithGeo?: StationData[];
    stationsWithoutGeo?: StationData[];
    statCoordMap?: { [key: string]: GeoCoord };
    statGeoMap?: { [key: string]: StationData[] };
}

interface FrameData {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
}

@Component({
    selector: 'fcl-gis-graph',
    templateUrl: './gis-graph.component.html',
    styleUrls: ['./gis-graph.component.scss']
})
export class GisGraphComponent implements OnInit, OnDestroy {
    private static readonly MIN_ZOOM = 0.1;
    private static readonly MAX_ZOOM = 100.0;
    private static readonly ZOOM_FACTOR = 1.5;
    private static readonly ZOOM_PADDING = 4;

    private static readonly NODE_SIZES: Map<Size, number> = new Map([[Size.SMALL, 12], [Size.MEDIUM, 25], [Size.LARGE, 50]]);

    private static readonly FONT_SIZES: Map<Size, number> = new Map([[Size.SMALL, 10], [Size.MEDIUM, 14], [Size.LARGE, 18]]);

    @ViewChild('container', { static: true }) containerElement: ElementRef;

    @ViewChild('map', { static: true }) mapElement: ElementRef;
    @ViewChild('graph', { static: true }) graphElement: ElementRef;
    @ViewChild('contextMenu', { static: true }) contextMenu: GraphContextMenuComponent;

    private componentIsActive = false;

    showZoom$ = this.store.select(tracingSelectors.getShowZoom);
    showLegend$ = this.store.select(tracingSelectors.getShowLegend);
    graphType$ = this.store.select(tracingSelectors.getGraphType);

    private graphStateSubscription: Subscription;
    private graphTypeSubscription: Subscription;

    zoomPercentage = 50;
    legendInfo: LegendInfo;

    private zoom: number;

    private cy: Cy;
    private map: ol.Map;

    private cachedState: GisGraphState;
    private cachedData: GraphServiceData;
    private noGeoData: NoGeoData;
    private frameData: FrameData;

    private resizeTimerSubscription: Subscription;
    private hoverDeliveriesSubject: Subject<string[]> = new Subject();
    private hoverDeliveriesSubjectSubscription: Subscription;
    private selectionTimerSubscription: Subscription;

    private isPanning = false;

    private edgeLabelOffsetUpdater = new EdgeLabelOffsetUpdater();

    constructor(
        private store: Store<fromTracing.State>,
        public elementRef: ElementRef,
        private styleService: StyleService,
        private graphService: GraphService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        window.onresize = () => {
            timer(500).subscribe(
                () => {
                    if (this.cy) {
                        this.resizeGraphAndMap();
                    }
                },
                error => {
                    throw new Error(`error initializing gis component: ${error}`);
                }
            );
        };

        const resizeSensor = new ResizeSensor(this.containerElement.nativeElement, () => {
            if (!this.resizeTimerSubscription && this.cy) {
                this.resizeTimerSubscription = timer(100).subscribe(
                    () => {
                        this.resizeTimerSubscription.unsubscribe();
                        this.resizeTimerSubscription = null;
                        this.resizeGraphAndMap();
                    },
                    error => {
                        throw new Error(`error resizing: ${error}`);
                    }
                );
            }
        });

        this.componentIsActive = true;

        this.graphTypeSubscription = this.graphType$.subscribe(
            type => {
                if (type !== GraphType.GIS) {
                    if (this.graphStateSubscription) {
                        this.graphStateSubscription.unsubscribe();
                        this.graphStateSubscription = null;
                    }
                } else {
                    if (!this.graphStateSubscription) {
                        this.graphStateSubscription = this.store
                            .select(tracingSelectors.getGisGraphData)
                            .pipe(filter(() => this.componentIsActive))
                            .subscribe(
                                graphState => this.applyState(graphState),
                                err => this.alertService.error(`getGisGraphData store subscription failed: ${err}`)
                            );
                    }
                }
            },
            err => this.alertService.error(`getGraphType store subscription failed: ${err}`)
        );

        this.hoverDeliveriesSubjectSubscription = this.hoverDeliveriesSubject.subscribe(
            ids => {
                const edgeIds = NonUIUtils.createStringSet(
                    ids
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
            },
            error => {
                throw new Error(`${error}`);
            }
        );
    }

    ngOnDestroy() {
        this.componentIsActive = false;
        if (this.resizeTimerSubscription) {
            this.resizeTimerSubscription.unsubscribe();
            this.resizeTimerSubscription = null;
        }
        if (this.graphTypeSubscription) {
            this.graphTypeSubscription.unsubscribe();
            this.graphTypeSubscription = null;
        }
        if (this.graphStateSubscription) {
            this.graphStateSubscription.unsubscribe();
            this.graphStateSubscription = null;
        }
        if (this.hoverDeliveriesSubjectSubscription) {
            this.hoverDeliveriesSubjectSubscription.unsubscribe();
            this.hoverDeliveriesSubjectSubscription = null;
        }
        if (this.selectionTimerSubscription) {
            this.selectionTimerSubscription.unsubscribe();
            this.selectionTimerSubscription = null;
        }
        this.cleanCy();
    }

    private cleanCy(): void {
        if (this.cy) {
            this.edgeLabelOffsetUpdater.disconnect();
            this.cy.destroy();
            this.cy = null;
        }
    }

    private initMap(mapConfig: { mapType: MapType; shapeFileData: ShapeFileData }): void {
        this.map = createOpenLayerMap(mapConfig, this.mapElement.nativeElement);
    }

    private applyMapType(mapConfig: { mapType: MapType; shapeFileData: ShapeFileData }): void {
        updateMapType(this.map, mapConfig);
    }

    private initCy(graphState: GisGraphState, graphData: GraphServiceData) {
        if (!this.map) {
            this.initMap(graphState);
        }
        const sub = timer(0).subscribe(
            () => {
                this.removeFrameLayer();

                const layout = this.getFitLayout(graphState, graphData);

                this.zoom = layout.zoom;

                this.cleanCy();
                this.cy = cytoscape({
                    container: this.graphElement.nativeElement,
                    elements: {
                        nodes: this.createNodes(layout, graphData),
                        edges: this.createEdges(graphData)
                    },
                    layout: { name: 'preset', zoom: 1, pan: layout.pan },
                    style: this.styleService.createCyStyle(
                        {
                            fontSize: GisGraphComponent.FONT_SIZES.get(graphState.fontSize),
                            nodeSize: GisGraphComponent.NODE_SIZES.get(graphState.nodeSize),
                            zoom: 1
                        },
                        graphData
                    ),
                    zoomingEnabled: false,
                    autoungrabify: true,
                    wheelSensitivity: 0.5
                });

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

                this.cy.on('pan', () => {
                    this.updateMap();
                    this.isPanning = true;
                });

                this.cy.on('tapstart', () => (this.isPanning = false));

                this.cy.on('tapend', () => {
                    if (this.isPanning) {
                        this.applyLayoutToStateIfNecessary();
                    }
                });

                // click un/selection
                this.cy.on('tapselect', event => this.processGraphElementSelectionChange());
                this.cy.on('tapunselect', event => this.processGraphElementSelectionChange());

                // box selection
                this.cy.on('boxselect', event => this.processGraphElementSelectionChange());

                this.contextMenu.connect(this.cy, this.hoverDeliveriesSubject);

                this.updateZoomPercentage();

                this.resizeGraphAndMap();

                this.applyLayoutToStateIfNecessary();

                this.edgeLabelOffsetUpdater.connectTo(this.cy);
            },
            err => this.alertService.error(`Cy graph could not be initialized: ${err}`)
        );
    }

    private updateMap() {
        this.map.setView(UIUtils.panZoomToView(this.cy.pan(), this.zoom, this.cy.width(), this.cy.height()));
    }

    private processGraphElementSelectionChange() {
        if (!this.selectionTimerSubscription) {
            this.selectionTimerSubscription = timer(0).subscribe(
                () => {
                    this.selectionTimerSubscription.unsubscribe();
                    this.applyElementSelectionToState();
                    this.edgeLabelOffsetUpdater.update(true);
                    this.selectionTimerSubscription = null;
                },
                error => {
                    throw new Error(`${error}`);
                }
            );
        }
    }

    private applyElementSelectionToState() {
        const selectedNodes = this.cy.nodes(':selected');
        const selectedEdges = this.cy.edges(':selected');

        this.store.dispatch(
            new tracingStoreActions.SetSelectedElementsSOA({
                selectedElements: {
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
                }
            })
        );
    }

    showMissingGISInfoEntry(): boolean {
        return !!this.noGeoData && this.noGeoData.withoutGeoData;
    }

    getCanvas(): Promise<HTMLCanvasElement> {
        return html2canvas(this.containerElement.nativeElement);
    }

    zoomInPressed() {
        this.zoomTo(this.zoom * GisGraphComponent.ZOOM_FACTOR, this.cy.width() / 2, this.cy.height() / 2);
    }

    zoomOutPressed() {
        this.zoomTo(this.zoom / GisGraphComponent.ZOOM_FACTOR, this.cy.width() / 2, this.cy.height() / 2);
    }

    zoomResetPressed() {
        this.applyGraphLayout(this.getFitLayout(this.cachedState, this.cachedData));
    }

    zoomSlided(value: string) {
        this.zoomTo(
            Math.exp((Number(value) / 100) * Math.log(this.cy.maxZoom() / this.cy.minZoom())) * this.cy.minZoom(),
            this.cy.width() / 2,
            this.cy.height() / 2
        );
    }

    private createNodes(layout: Layout, graphData: GraphServiceData): CyNodeDef[] {
        const result = graphData.nodeData.map(nodeData => ({
            group: 'nodes',
            data: nodeData,
            selected: nodeData.selected,
            position: this.calculateNodePosition(nodeData.station)
        }));

        return result;
    }

    private calculateNodePosition(station: StationData): Position {
        let position: Position;

        if (UIUtils.hasGisInfo(station)) {
            position = UIUtils.latLonToPosition(station.lat, station.lon, this.zoom);
        } else {
            const stationCoords: GeoCoord = this.noGeoData.statCoordMap[station.id];
            position = UIUtils.latLonToPosition(stationCoords.lat, stationCoords.lon, this.zoom);
        }

        return position;
    }

    private createEdges(graphData: GraphServiceData): CyEdgeDef[] {
        return graphData.edgeData.map(edgeData => ({
            group: 'edges',
            data: edgeData,
            selected: edgeData.selected
        }));
    }

    private updateGraphEdges(graphData: GraphServiceData) {
        this.cy.batch(() => {
            this.cy.edges().remove();
            this.cy.add(this.createEdges(graphData));
        });
        this.edgeLabelOffsetUpdater.update(true);
    }

    private updateGraph(graphState: GisGraphState, graphData: GraphServiceData) {
        this.cy.batch(() => {
            this.cy.elements().remove();
            this.cy.add(this.createNodes(graphState.layout, graphData));
            this.cy.add(this.createEdges(graphData));
            this.updateGraphStyle(graphState, graphData);
        });
        this.updateMap();
        this.edgeLabelOffsetUpdater.update(true);
    }

    private updateGraphStyle(graphState: GisGraphState, graphData: GraphServiceData) {
        if (this.cy && this.cy.style) {
            this.cy.setStyle(
                this.styleService.createCyStyle(
                    {
                        fontSize: GisGraphComponent.FONT_SIZES.get(graphState.fontSize),
                        nodeSize: GisGraphComponent.NODE_SIZES.get(graphState.nodeSize),
                        zoom: 1
                    },
                    graphData
                )
            );
            this.cy.elements().scratch('_update', true);
            this.edgeLabelOffsetUpdater.update(true);
        }
    }

    private updateGraphSelection(graphData: GraphServiceData) {
        if (this.cy != null) {
            this.cy.batch(() => {
                this.cy.elements(':selected[!selected]').unselect();
                this.cy.elements(':unselected[?selected]').select();
                this.cy.elements().scratch('_update', true);
            });
        }
    }

    private zoomTo(newZoom: number, zx: number, zy: number) {
        newZoom = Math.min(Math.max(newZoom, GisGraphComponent.MIN_ZOOM), GisGraphComponent.MAX_ZOOM);
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

    private applyGraphLayout(layout: Layout) {
        this.zoom = layout.zoom;
        this.cy.batch(() => {
            this.cy.pan(layout.pan);
            this.cy.nodes().positions(node => this.calculateNodePosition(node.data().station));
        });
        this.map.setView(UIUtils.panZoomToView(layout.pan, this.zoom, this.cy.width(), this.cy.height()));
        this.applyLayoutToStateIfNecessary();
        this.updateZoomPercentage();
    }

    private updateZoomPercentage() {
        this.zoomPercentage = Math.round(
            (Math.log(this.zoom / GisGraphComponent.MIN_ZOOM) / Math.log(GisGraphComponent.MAX_ZOOM / GisGraphComponent.MIN_ZOOM)) * 100
        );
    }

    private applyLayoutToStateIfNecessary() {
        if (
            !this.cachedState ||
            !this.cachedState.layout ||
            this.cachedState.layout.zoom !== this.zoom ||
            this.cachedState.layout.pan.x !== this.cy.pan().x ||
            this.cachedState.layout.pan.y !== this.cy.pan().y
        ) {
            this.store.dispatch(
                new tracingStoreActions.SetGisGraphLayoutSOA({
                    layout: {
                        zoom: this.zoom,
                        pan: { ...this.cy.pan() }
                    }
                })
            );
        }
    }

    private resizeGraphAndMap() {
        this.cy.resize();
        this.map.updateSize();
        this.updateMap();
    }

    private getFitLayout(graphState: GisGraphState, graphData: GraphServiceData): Layout {

        this.noGeoData = {
            withoutGeoData: false
        };

        this.removeFrameLayer();

        const width = this.containerElement.nativeElement.offsetWidth;
        const height = this.containerElement.nativeElement.offsetHeight;
        const border = GisGraphComponent.NODE_SIZES.get(graphState.nodeSize);

        let xMin = Number.POSITIVE_INFINITY;
        let yMin = Number.POSITIVE_INFINITY;
        let xMax = Number.NEGATIVE_INFINITY;
        let yMax = Number.NEGATIVE_INFINITY;

        let xMinFrame = Number.POSITIVE_INFINITY;
        let yMinFrame = Number.POSITIVE_INFINITY;
        let xMaxFrame = Number.NEGATIVE_INFINITY;
        let yMaxFrame = Number.NEGATIVE_INFINITY;

        let xMinFramePos;
        let yMinFramePos;
        let xMaxFramePos;
        let yMaxFramePos;

        let zoom: number;
        let pan: Position;

        const stationsWithGeo: StationData[] = graphData.nodeData
            .map(data => data.station)
            .filter(station => UIUtils.hasGisInfo(station));

        const stationsWithoutGeo: StationData[] = graphData.nodeData
            .map(data => data.station)
            .filter(station => !UIUtils.hasGisInfo(station));

        this.noGeoData.withoutGeoData = stationsWithoutGeo.length > 0;

        for (const station of stationsWithGeo) {
            const p = UIUtils.latLonToPosition(station.lat, station.lon, 1.0);

            xMin = Math.min(xMin, p.x);
            yMin = Math.min(yMin, p.y);
            xMax = Math.max(xMax, p.x);
            yMax = Math.max(yMax, p.y);

            if (this.noGeoData.withoutGeoData) {
                const frameOlCoords = UIUtils.latLonToOlCoords(station.lat, station.lon);

                xMinFrame = Math.min(xMinFrame, frameOlCoords[0]);
                yMinFrame = Math.min(yMinFrame, frameOlCoords[1]);
                xMaxFrame = Math.max(xMaxFrame, frameOlCoords[0]);
                yMaxFrame = Math.max(yMaxFrame, frameOlCoords[1]);
            }
        }

        if (!this.noGeoData.withoutGeoData) {
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

        } else {
            if (xMax > xMin && yMax > yMin) {
                xMinFramePos = xMin - GisGraphComponent.ZOOM_PADDING;
                yMinFramePos = yMin - GisGraphComponent.ZOOM_PADDING;
                xMaxFramePos = xMax + GisGraphComponent.ZOOM_PADDING;
                yMaxFramePos = yMax + GisGraphComponent.ZOOM_PADDING;

                zoom = Math.min(
                    (width - 2 * border) / (xMaxFramePos - xMinFramePos),
                    (height - 2 * border) / (yMaxFramePos - yMinFramePos)
                ) * 0.8;
            } else {
                zoom = 1;
            }

            if (Number.isFinite(xMin) && Number.isFinite(yMin) && Number.isFinite(xMax) && Number.isFinite(yMax)) {
                const panX1 = -xMinFramePos * zoom + border;
                const panY1 = -yMinFramePos * zoom + border;
                const panX2 = -xMaxFramePos * zoom + width - border;
                const panY2 = -yMaxFramePos * zoom + height - border;

                pan = { x: (panX1 + panX2) / 2, y: (panY1 + panY2) / 2 };
            } else {
                pan = { x: 0, y: 0 };
            }

            xMinFrame -= Math.abs(xMinFrame - xMaxFrame) * 0.1;
            xMaxFrame += Math.abs(xMinFrame - xMaxFrame) * 0.1;
            yMinFrame -= Math.abs(yMinFrame - yMaxFrame) * 0.1;
            yMaxFrame += Math.abs(yMinFrame - yMaxFrame) * 0.1;

            this.frameData = {
                xMin: xMinFrame,
                xMax: xMaxFrame,
                yMin: yMinFrame,
                yMax: yMaxFrame
            };

            this.addFrameLayer();

            this.noGeoData.stationsWithGeo = stationsWithGeo;
            this.noGeoData.stationsWithoutGeo = stationsWithoutGeo;
            const neighbors = this.getNeighborsWithoutGeo(stationsWithGeo, graphData);
            this.determineNextGeoNeighbor(neighbors, graphData);
            this.calculateCoords(stationsWithGeo, neighbors, graphData);

            const keys = _.keys(this.noGeoData.statCoordMap);
            if (keys.length < this.noGeoData.stationsWithoutGeo.length) {
                this.noGeoData.stationsWithoutGeo
                    .filter((station: StationData) => _.indexOf(keys, station.id) === -1)
                    .map((station: StationData) => {
                        const coords = _.has(this.noGeoData, 'statCoordMap') ? this.noGeoData.statCoordMap : {};
                        const [stationLon, stationLat] = UIUtils.olCoordsTolatLon(this.frameData.yMax, this.frameData.xMin);
                        coords[station.id] = {
                            lon: stationLon,
                            lat: stationLat
                        };
                        this.noGeoData.statCoordMap = coords;
                    });
            }
        }

        return { zoom: zoom, pan: pan };
    }

    private updateEdgeLabels() {
        if (this.cy && this.cy.style) {
            this.cy.edges().scratch('_update', true);
        }
    }

    private calculateCoords(stationsWithGeo: StationData[], neighbors: StationData[], graphData: GraphServiceData) {
        if (neighbors.length === 0) {
            return;
        } else {
            neighbors.map((station: StationData) => {
                const coords = _.has(this.noGeoData, 'statCoordMap') ? this.noGeoData.statCoordMap : {};

                if (_.has(this.noGeoData.statGeoMap, station.id)) {
                    const stationsGeo: StationData[] = this.noGeoData.statGeoMap[station.id];

                    const stationLatLon = stationsGeo.reduce((acc, stationGeo) => {
                        acc.lat += stationGeo.lat;
                        acc.lon += stationGeo.lon;
                        return acc;
                    }, { lat: 0, lon: 0 });

                    const [x, y] = UIUtils.latLonToOlCoords(
                        (stationLatLon.lat / stationsGeo.length),
                        (stationLatLon.lon / stationsGeo.length)
                    );

                    const xMinDiff = Math.abs(x - this.frameData.xMin);
                    const xMaxDiff = Math.abs(x - this.frameData.xMax);
                    const yMinDiff = Math.abs(y - this.frameData.yMin);
                    const yMaxDiff = Math.abs(y - this.frameData.yMax);

                    const min = Math.min(xMinDiff, xMaxDiff, yMinDiff, yMaxDiff);

                    let stationX: number;
                    let stationY: number;

                    if (xMinDiff === min) {
                        stationX = this.frameData.xMin;
                        stationY = this.frameData.yMax - yMaxDiff;
                    } else if (xMaxDiff === min) {
                        stationX = this.frameData.xMax;
                        stationY = this.frameData.yMax - yMaxDiff;
                    } else if (yMinDiff === min) {
                        stationX = this.frameData.xMin + xMinDiff;
                        stationY = this.frameData.yMin;
                    } else if (yMaxDiff === min) {
                        stationX = this.frameData.xMin + xMinDiff;
                        stationY = this.frameData.yMax;
                    }

                    const [stationLon, stationLat] = UIUtils.olCoordsTolatLon(stationY, stationX);

                    coords[station.id] = {
                        lat: stationLat,
                        lon: stationLon
                    };
                } else {

                    const stationNeighbors: StationData[] = this.getStationNeighbors(station, graphData);
                    let found: boolean = false;
                    const stationWithCoord: StationData[] = stationNeighbors.map((neighbor: StationData) => {
                        if (_.has(this.noGeoData.statCoordMap, neighbor.id) && !found) {
                            found = true;
                            return neighbor;
                        }
                    });

                    let stationLon: number;
                    let stationLat: number;

                    if (stationWithCoord.length > 0) {
                        const geoCoord: GeoCoord = this.noGeoData.statCoordMap[stationWithCoord[0].id];
                        stationLon = geoCoord.lon;
                        stationLat = geoCoord.lat;
                    } else {
                        [stationLon, stationLat] = UIUtils.olCoordsTolatLon(this.frameData.yMax, this.frameData.xMin);
                    }

                    coords[station.id] = {
                        lon: stationLon,
                        lat: stationLat
                    };
                }

                this.noGeoData.statCoordMap = coords;
            });
            const newStationsWithGeo = [...stationsWithGeo, ...neighbors];
            this.calculateCoords(newStationsWithGeo, this.getNeighborsWithoutGeo(newStationsWithGeo, graphData), graphData);
        }
    }

    private getNeighborsWithoutGeo(stationsWithGeo: StationData[], graphData: GraphServiceData): StationData[] {

        const neighborsWithoutGeo: StationData[] = _.uniq(_.flattenDeep(stationsWithGeo
            .map((station: StationData) => [station.incoming, station.outgoing])

            .map(([delIdsIn, delIdsOut]) => {
                const delsIn: DeliveryData[] = delIdsIn.map((delIdIn: string) => graphData.delMap[delIdIn]);
                const delsOut: DeliveryData[] = delIdsOut.map((delIdOut: string) => graphData.delMap[delIdOut]);
                return [delsIn, delsOut];
            })
            .map(([delsIn, delsOut]) => {
                const statIdsSource: string[] = delsIn.map((del: DeliveryData) => del.source);
                const statIdsTarget: string[] = delsOut.map((del: DeliveryData) => del.target);
                return [statIdsSource, statIdsTarget];
            })
            .map(([statIdsSource, statIdsTarget]) => {
                const statsSource: StationData[] = statIdsSource.map((statIdSource: string) => graphData.statMap[statIdSource]);
                const statsTarget: StationData[] = statIdsTarget.map((statIdTarget: string) => graphData.statMap[statIdTarget]);
                return [statsSource, statsTarget];
            })))
            .filter((station: StationData) => !UIUtils.hasGisInfo(station) && !_.has(this.noGeoData.statCoordMap, station.id));

        return neighborsWithoutGeo;
    }

    private determineNextGeoNeighbor(neighbors: StationData[], graphData: GraphServiceData) {
        const geoMap = _.has(this.noGeoData, 'statGeoMap') ? this.noGeoData.statGeoMap : {};

        neighbors
            .map((station: StationData) => {

                const stationNeighbors: StationData[] = this.getStationNeighbors(station, graphData);
                stationNeighbors.forEach((neighbor: StationData) => {
                    if (_.indexOf(this.noGeoData.stationsWithGeo, neighbor) >= 0) {
                        const mappedStation = geoMap[station.id] ? geoMap[station.id] : [];
                        mappedStation.push(neighbor);
                        geoMap[station.id] = mappedStation;
                    }
                });

            });

        this.noGeoData.statGeoMap = geoMap;
    }

    private getStationNeighbors(station: StationData, graphData: GraphServiceData): StationData[] {
        const outStations: StationData[] = station.outgoing
            .map((delIdOut: string) => graphData.delMap[delIdOut])
            .map((delOut: DeliveryData) => delOut.target)
            .map((statIdOut: string) => graphData.statMap[statIdOut])
            .map((statOut: StationData) => statOut);

        const inStations: StationData[] = station.incoming
            .map((delIdIn: string) => graphData.delMap[delIdIn])
            .map((delIn: DeliveryData) => delIn.source)
            .map((statIdIn: string) => graphData.statMap[statIdIn])
            .map((statIn: StationData) => statIn);

        return [..._.uniq(outStations), ..._.uniq(inStations)];
    }

    private addFrameLayer() {
        setFrameLayer(this.map, this.frameData);
    }

    private removeFrameLayer() {
        removeFrameLayer(this.map);
    }

    private applyState(newState: GisGraphState) {
        const newData: GraphServiceData = this.graphService.getData(newState);
        if (!this.cachedData || this.cachedState.fclElements !== newState.fclElements) {
            this.initCy(newState, newData);
        } else if (this.cachedData.nodeData !== newData.nodeData) {
            this.updateGraph(newState, newData);
        } else if (this.cachedData.edgeData !== newData.edgeData) {
            this.updateGraphEdges(newData);
        } else if (this.cachedData.propsChangedFlag !== newData.propsChangedFlag) {
            this.updateGraphStyle(newState, newData);
        } else if (
            !this.selectionTimerSubscription &&
            (this.cachedData.nodeSel !== newData.nodeSel || this.cachedData.edgeSel !== newData.edgeSel)) {
            this.updateGraphSelection(newData);
        } else if (this.cachedState.nodeSize !== newState.nodeSize) {
            this.updateGraphStyle(newState, newData);
        } else if (this.cachedState.fontSize !== newState.fontSize) {
            this.updateGraphStyle(newState, newData);
        } else if (this.cachedData.edgeLabelChangedFlag !== newData.edgeLabelChangedFlag) {
            this.updateEdgeLabels();
        } else if (
            this.cachedState.mapType !== newState.mapType ||
            this.cachedState.shapeFileData !== newState.shapeFileData
        ) {
            this.applyMapType(newState);
        }
        this.cachedData = {
            ...this.cachedData,
            ...newData
        };
        this.cachedState = {
            ...this.cachedState,
            ...newState
        };
        this.legendInfo = newData.legendInfo;
    }
}
