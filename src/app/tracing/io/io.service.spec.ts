import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TestBed, async } from '@angular/core/testing';
import { IOService } from './io.service';
import { FclData, GraphType, Size, ObservedType, MergeDeliveriesType, MapType } from '../data.model';
import { JsonData, VERSION } from './ext-data-model.v1';

describe('IOService', () => {

    let ioService: IOService;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule
            ],
            providers: [
                IOService
            ]
        });

        ioService = TestBed.get(IOService);
    }));

    it('should instantiate the io service', () => {
        expect(ioService).toBeTruthy();
    });

    it('should generate export data correctly', async(() => {

        const fclData: FclData = {
            fclElements: {
                stations: [
                    { id: 'S1', name: 'Station 1', lat: null, lon: null, incoming: [], outgoing: ['D1'], connections: [], properties: [] },
                    { id: 'S2', name: 'Station 2', lat: null, lon: null, incoming: ['D2'], outgoing: [], connections: [], properties: [] }
                ],
                deliveries: [
                    { id: 'D1', source: 'S1', target: 'S2', name: 'Product P', lot: 'Lot 1', lotKey: null, date: null, properties: [] }
                ],
                samples: []
            },
            graphSettings: {
                type: GraphType.GRAPH,
                mapType: MapType.MAPNIK,
                shapeFileData: null,
                nodeSize: Size.MEDIUM,
                fontSize: Size.MEDIUM,
                showLegend: true,
                showZoom: true,
                mergeDeliveriesType: MergeDeliveriesType.NO_MERGE,
                showMergedDeliveriesCounts: false,
                skipUnconnectedStations: false,
                selectedElements: {
                    stations: [],
                    deliveries: []
                },
                schemaLayout: { zoom: 1, pan: { x: 0.5, y: 0.5 } },
                gisLayout: null,
                stationPositions: {
                    S1: { x: 0, y: 0 },
                    S2: { x: 1, y: 1 }
                },
                highlightingSettings: {
                    invisibleStations: []
                }
            },
            groupSettings: [],
            tracingSettings: {
                stations: [
                    {
                        id: 'S1',
                        outbreak: false,
                        weight: 0,
                        crossContamination: false,
                        killContamination: false,
                        observed: ObservedType.NONE
                    },
                    {
                        id: 'S2',
                        outbreak: false,
                        weight: 0,
                        crossContamination: false,
                        killContamination: false,
                        observed: ObservedType.NONE
                    }
                ],
                deliveries: [
                    {
                        id: 'D1',
                        weight: 0,
                        crossContamination: false,
                        killContamination: false,
                        observed: ObservedType.NONE
                    }
                ]
            },
            tableSettings: null
        };

        const expectedExportData: JsonData = {
            version: VERSION,
            data: {
                version: VERSION,
                stations: {
                    columnProperties: [
                        { id: 'ID', type: 'string' },
                        { id: 'Name', type: 'string' },
                        { id: 'GeocodingLatitude', type: 'double' },
                        { id: 'GeocodingLongitude', type: 'double' }
                    ],
                    data: [
                        [
                            { id: 'ID', value: 'S1' },
                            { id: 'Name', value: 'Station 1' },
                            { id: 'GeocodingLatitude', value: null },
                            { id: 'GeocodingLongitude', value: null }
                        ],
                        [
                            { id: 'ID', value: 'S2' },
                            { id: 'Name', value: 'Station 2' },
                            { id: 'GeocodingLatitude', value: null },
                            { id: 'GeocodingLongitude', value: null }
                        ]
                    ]
                },
                deliveries: {
                    columnProperties: [
                        { id: 'ID', type: 'string' },
                        { id: 'from', type: 'string' },
                        { id: 'to', type: 'string' },
                        { id: 'Name', type: 'string' },
                        { id: 'Lot ID', type: 'string' }
                    ],
                    data: [
                        [
                            { id: 'ID', value: 'D1' },
                            { id: 'from', value: 'S1' },
                            { id: 'to', value: 'S2' },
                            { id: 'Name', value: 'Product P' },
                            { id: 'Lot ID', value: 'Lot 1' }
                        ]
                    ]
                },
                deliveryRelations: {
                    columnProperties: [
                        { id: 'from', type: 'string' },
                        { id: 'to', type: 'string' }
                    ],
                    data: []
                }
            },
            tracing: {
                version: VERSION,
                nodes: fclData.tracingSettings.stations.map(s => ({
                    id: s.id,
                    weight: s.weight,
                    crossContamination: s.crossContamination,
                    killContamination: s.killContamination,
                    observed: s.observed !== ObservedType.NONE
                })),
                deliveries: fclData.tracingSettings.deliveries.map(d => ({
                    id: d.id,
                    weight: d.weight,
                    crossContamination: d.crossContamination,
                    killContamination: d.killContamination,
                    observed: d.observed !== ObservedType.NONE
                }))
            },
            settings: {
                version: VERSION,
                metaNodes: [],
                view: {
                    showGis: fclData.graphSettings.type === GraphType.GIS,
                    showLegend: fclData.graphSettings.showLegend,
                    edge: {
                        joinEdges: fclData.graphSettings.mergeDeliveriesType === MergeDeliveriesType.MERGE_ALL,
                        mergeDeliveriesType: 'NO_MERGE',
                        showMergedDeliveriesCounts: false,
                        selectedEdges: fclData.graphSettings.selectedElements.deliveries
                    },
                    node: {
                        skipEdgelessNodes: fclData.graphSettings.skipUnconnectedStations,
                        selectedNodes: fclData.graphSettings.selectedElements.stations
                    },
                    graph: {
                        transformation: {
                            scale: { x: fclData.graphSettings.schemaLayout.zoom, y: fclData.graphSettings.schemaLayout.zoom },
                            translation: fclData.graphSettings.schemaLayout.pan
                        },
                        node: {
                            positions: fclData.fclElements.stations.map(
                                s => ({
                                    id: s.id,
                                    position: fclData.graphSettings.stationPositions[s.id]
                                })
                            )
                        }
                    },
                    gis: {
                        transformation: null
                    }
                }
            }

        };

        ioService.getExportData(fclData)
            .then(observedExportData => {
                expect(observedExportData).toEqual(expectedExportData);
            }).catch(error => { throw error; });
    }));
});
