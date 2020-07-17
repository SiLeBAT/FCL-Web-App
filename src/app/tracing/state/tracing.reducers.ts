import { TracingActions, TracingActionTypes } from './tracing.actions';
import { Constants } from '../util/constants';
import {
    FclData,
    MergeDeliveriesType,
    MapType,
    GraphType,
    ROASettings
} from '../data.model';

import { filter } from 'lodash';
import { TracingState } from '../state.model';
import { ComplexRowFilterSettings, FilterTableSettings, ShowType, VisibilityFilterState, FilterSettings, ConfigurationTabIndex } from '../configuration/configuration.model';

export const STATE_SLICE_NAME = 'tracing';

export interface State {
    tracing: TracingState;
}

const complexFilterSettings: ComplexRowFilterSettings = {
    conditions: []
};

const filterTableSettings: FilterTableSettings = {
    columnOrder: [],
    standardFilter: '',
    complexFilter: complexFilterSettings,
    predefinedFilter: ShowType.ALL,
    visibilityFilter: VisibilityFilterState.SHOW_ALL,
    columnFilters: []
};

const initialFilterSettings: FilterSettings = {
    stationFilter: {
        ...filterTableSettings,
        columnOrder: Constants.DEFAULT_TABLE_STATION_COLUMNS.toArray()
    },
    deliveryFilter: {
        ...filterTableSettings,
        columnOrder: Constants.DEFAULT_TABLE_DELIVERY_COLUMNS.toArray()
    }
};

const initialData: FclData = createInitialFclDataState();

const initialTabIndices: ConfigurationTabIndex = {
    activeMainTabIndex: 0,
    activeFilterTabIndex: 0,
    activeHighlightingTabIndex: 0
};

const initialState: TracingState = {
    fclData: initialData,
    roaSettings: createDefaultROASettings(),
    visioReport: null,
    tracingActive: false,
    showConfigurationSideBar: false,
    configurationTabIndices: initialTabIndices,
    showGraphSettings: false,
    filterSettings: initialFilterSettings
};

export function createInitialFclDataState(): FclData {
    return {
        source: null,
        fclElements: {
            stations: [],
            deliveries: [],
            samples: []
        },
        graphSettings: {
            type: Constants.DEFAULT_GRAPH_TYPE,
            nodeSize: Constants.DEFAULT_GRAPH_NODE_SIZE,
            fontSize: Constants.DEFAULT_GRAPH_FONT_SIZE,
            mergeDeliveriesType: MergeDeliveriesType.NO_MERGE,
            showMergedDeliveriesCounts: false,
            skipUnconnectedStations: Constants.DEFAULT_SKIP_UNCONNECTED_STATIONS,
            showLegend: Constants.DEFAULT_GRAPH_SHOW_LEGEND,
            showZoom: Constants.DEFAULT_GRAPH_SHOW_ZOOM,
            selectedElements: {
                stations: [],
                deliveries: []
            },
            stationPositions: {},
            highlightingSettings: {
                invisibleStations: [],
                stations: [],
                deliveries: []
            },
            schemaLayout: null,
            gisLayout: null,
            mapType: Constants.DEFAULT_MAP_TYPE,
            shapeFileData: null,
            ghostStation: null
        },
        tracingSettings: {
            stations: [],
            deliveries: []
        },
        groupSettings: []
    };
}

export function createDefaultROASettings(): ROASettings {
    return {
        labelSettings: {
            stationLabel: [
                [
                    { prop: 'typeOfBusiness', altText: 'Unknown activity' },
                    { text: ': ' },
                    { prop: 'name', altText: 'Unknown FBO' }
                ]
            ],

            lotLabel: [
                [ { prop: 'name', altText: 'Unknown product name' } ],
                [ { text: 'Lot: ' }, { prop: 'lot', altText: 'unknown' } ],
                [ { text: 'Amount: ' }, { prop: 'lotQuantity', altText: 'unknown' } ]
            ],

            stationSampleLabel: [
                [ { prop: 'type', altText: 'Unknown type' } ],
                [ { prop: 'material', altText: 'Unknown material' } ],
                [ { prop: 'amount', altText: 'Unknown amount' } ],
                [ { prop: 'result', altText: 'Unknown result' } ],
                [ { prop: 'time', altText: 'Unknown time' } ]
            ],

            lotSampleLabel: [
                [ { prop: 'type', altText: 'Unknown type' } ],
                [ { prop: 'amount', altText: 'Unknown amount' } ],
                [ { prop: 'result', altText: 'Unknown result' } ],
                [ { prop: 'time', altText: 'Unknown time' } ]
            ]
        }
    };
}

// REDUCER
export function reducer(state: TracingState = initialState, action: TracingActions): TracingState {
    switch (action.type) {
        case TracingActionTypes.TracingActivated:
            return {
                ...state,
                tracingActive: action.payload.isActivated
            };

        case TracingActionTypes.LoadFclDataSuccess:
            action.payload.fclData.graphSettings.mapType = state.fclData.graphSettings.mapType;
            action.payload.fclData.graphSettings.shapeFileData = state.fclData.graphSettings.shapeFileData;

            return {
                ...state,
                fclData: action.payload.fclData,
                filterSettings: initialFilterSettings
            };

        case TracingActionTypes.LoadFclDataFailure:
            return {
                ...state,
                fclData: initialData
            };

        case TracingActionTypes.GenerateVisioLayoutSuccess:
            return {
                ...state,
                visioReport: action.payload
            };

        case TracingActionTypes.ShowGraphSettingsSOA:
            return {
                ...state,
                showGraphSettings: action.payload.showGraphSettings
            };

        case TracingActionTypes.ShowConfigurationSideBarSOA:
            return {
                ...state,
                showConfigurationSideBar: action.payload.showConfigurationSideBar
            };

        case TracingActionTypes.SetGraphTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: action.payload.graphType
                    }
                }
            };

        case TracingActionTypes.SetMapTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: GraphType.GIS,
                        mapType: action.payload.mapType
                    }
                }
            };

        case TracingActionTypes.LoadShapeFileSuccessSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: GraphType.GIS,
                        mapType: MapType.SHAPE_FILE,
                        shapeFileData: action.payload.shapeFileData
                    }
                }
            };

        case TracingActionTypes.SetNodeSizeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        nodeSize: action.payload.nodeSize
                    }
                }
            };

        case TracingActionTypes.SetFontSizeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        fontSize: action.payload.fontSize
                    }
                }
            };

        case TracingActionTypes.SetMergeDeliveriesTypeSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        mergeDeliveriesType: action.payload.mergeDeliveriesType
                    }
                }
            };

        case TracingActionTypes.ShowMergedDeliveriesCountsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showMergedDeliveriesCounts: action.payload.showMergedDeliveriesCounts
                    }
                }
            };

        case TracingActionTypes.ShowLegendSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showLegend: action.payload
                    }
                }
            };

        case TracingActionTypes.ShowZoomSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showZoom: action.payload
                    }
                }
            };

        case TracingActionTypes.SetStationFilterSOA:
            return {
                ...state,
                filterSettings: {
                    ...state.filterSettings,
                    stationFilter: action.payload.settings
                }
            };

        case TracingActionTypes.ResetAllStationFiltersSOA:
            return {
                ...state,
                filterSettings: {
                    ...initialFilterSettings,
                    stationFilter: {
                        ...filterTableSettings,
                        columnOrder: state.filterSettings.stationFilter.columnOrder
                    }
                }
            };

        case TracingActionTypes.SetFilterStationTableColumnOrderSOA:
            const newColumnOrder = action.payload.columnOrder;
            const oldColumnFilters = state.filterSettings.stationFilter.columnFilters;
            const newColumnFilters = oldColumnFilters.filter(f => newColumnOrder.includes(f.filterProp));

            return {
                ...state,
                filterSettings: {
                    ...state.filterSettings,
                    stationFilter: {
                        ...state.filterSettings.stationFilter,
                        columnOrder: newColumnOrder,
                        columnFilters: oldColumnFilters.length === newColumnOrder.length ? oldColumnFilters : newColumnFilters
                    }
                }
            };

        case TracingActionTypes.SetSelectedElementsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        selectedElements: action.payload.selectedElements
                    }
                }
            };

        case TracingActionTypes.SetStationPositionsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        stationPositions: action.payload.stationPositions
                    }
                }
            };
        case TracingActionTypes.SetStationPositionsAndLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        stationPositions: action.payload.stationPositions,
                        schemaLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetSchemaGraphLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        schemaLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetGisGraphLayoutSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        gisLayout: action.payload.layout
                    }
                }
            };
        case TracingActionTypes.SetStationGroupsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    groupSettings: action.payload.groupSettings,
                    tracingSettings: {
                        ...state.fclData.tracingSettings,
                        stations: action.payload.stationTracingSettings
                    },
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        selectedElements: {
                            ...state.fclData.graphSettings.selectedElements,
                            stations: action.payload.selectedStations
                        },
                        highlightingSettings: {
                            ...state.fclData.graphSettings.highlightingSettings,
                            invisibleStations: action.payload.invisibleStations
                        },
                        stationPositions: action.payload.stationPositions
                    }
                }
            };

        case TracingActionTypes.SetTracingSettingsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tracingSettings: action.payload.tracingSettings
                }
            };

        case TracingActionTypes.SetHighlightingSettingsSOA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        highlightingSettings: action.payload.highlightingSettings
                    }
                }
            };

        case TracingActionTypes.ShowGhostStationMSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        ghostStation: action.payload.stationId
                    }
                }
            };

        case TracingActionTypes.ClearGhostStationMSA:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        ghostStation: null
                    }
                }
            };

        case TracingActionTypes.SetActiveMainTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeMainTabIndex: action.payload.activeMainTabIndex
                }
            };

        case TracingActionTypes.SetActiveFilterTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeFilterTabIndex: action.payload.activeFilterTabIndex
                }
            };

        case TracingActionTypes.SetActiveHighlightingTabIndexSSA:
            return {
                ...state,
                configurationTabIndices: {
                    ...state.configurationTabIndices,
                    activeHighlightingTabIndex: action.payload.activeHighlightingTabIndex
                }
            };

        case TracingActionTypes.SetROAReportSettingsSOA:
            return {
                ...state,
                roaSettings: action.payload.roaSettings
            };

        default:
            return state;
    }
}
