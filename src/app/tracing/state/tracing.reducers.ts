import * as fromRoot from '../../state/app.state';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TracingActions, TracingActionTypes } from './tracing.actions';
import { DataService } from '../services/data.service';
import { FclData, TableMode } from '../util/datatypes';
import { VisioReport } from '../visio/layout-engine/datatypes';

export const STATE_SLICE_NAME = 'tracing';

export interface State extends fromRoot.State {
    tracing: TracingState;
}

export interface TracingState {
    fclData: FclData;
    visioReport: VisioReport | null;
    sideBars: SideBarState;
    options: SettingOptions;
    tracingActive: boolean;
}

export interface SideBarState {
    leftSideBarOpen: boolean;
    rightSideBarOpen: boolean;
}

export interface SettingOptions {
    graphSettingsOption: string;
    tableSettingsOption: string;
}

const initialData: FclData = {
    elements: {
        stations: [],
        deliveries: [],
        samples: []
    },
    layout: null,
    gisLayout: null,
    graphSettings: DataService.getDefaultGraphSettings(),
    tableSettings: DataService.getDefaultTableSettings()
};

const initialState: TracingState = {
    fclData: initialData,
    visioReport: null,
    sideBars: {
        leftSideBarOpen: false,
        rightSideBarOpen: false
    },
    options: {
        graphSettingsOption: 'type',
        tableSettingsOption: 'mode'
    },
    tracingActive: false
};

// SELECTORS
export const getTracingFeatureState = createFeatureSelector<TracingState>(STATE_SLICE_NAME);

export const getFclData = createSelector(
    getTracingFeatureState,
    state => state.fclData
);

export const getTracingActive = createSelector(
    getTracingFeatureState,
    state => state.tracingActive
);

export const getVisioReport = createSelector(
    getTracingFeatureState,
    state => state.visioReport
);

export const getSideBarStates = createSelector(
    getTracingFeatureState,
    (state: TracingState) => state.sideBars
);

export const getGraphSettingsOption = createSelector(
    getTracingFeatureState,
    (state: TracingState) => state.options.graphSettingsOption
);

export const getTableSettingsOption = createSelector(
    getTracingFeatureState,
    (state: TracingState) => state.options.tableSettingsOption
);

// REDUCER
export function reducer(state: TracingState = initialState, action: TracingActions): TracingState {
    switch (action.type) {
        case TracingActionTypes.SetTracingActive:
            return {
                ...state,
                tracingActive: action.payload
            };

        case TracingActionTypes.LoadFclDataSuccess:
            return {
                ...state,
                fclData: action.payload
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

        case TracingActionTypes.ToggleLeftSideBar:
            return {
                ...state,
                sideBars: {
                    ...state.sideBars,
                    leftSideBarOpen: action.payload
                }
            };

        case TracingActionTypes.ToggleRightSideBar:
            return {
                ...state,
                sideBars: {
                    ...state.sideBars,
                    rightSideBarOpen: action.payload
                }
            };

        case TracingActionTypes.SetGraphType:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        type: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'type'
                }
            };

        case TracingActionTypes.SetNodeSize:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        nodeSize: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'nodeSize'
                }
            };

        case TracingActionTypes.SetFontSize:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        fontSize: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'fontSize'
                }

            };

        case TracingActionTypes.MergeDeliveries:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        mergeDeliveries: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'mergeDeliveries'
                }
            };

        case TracingActionTypes.ShowLegend:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showLegend: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'showLegend'
                }
            };

        case TracingActionTypes.ShowZoom:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    graphSettings: {
                        ...state.fclData.graphSettings,
                        showZoom: action.payload
                    }
                },
                options: {
                    ...state.options,
                    graphSettingsOption: 'showZoom'
                }
            };

        case TracingActionTypes.SetTableMode:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: {
                        ...state.fclData.tableSettings,
                        mode: action.payload
                    }
                },
                options: {
                    ...state.options,
                    tableSettingsOption: 'mode'
                }
            };

        case TracingActionTypes.SetTableColumns:
            const tableMode = action.payload[0];
            const selections: string[] = action.payload[1];
            const tableSettings = state.fclData.tableSettings;
            let options: string;

            if (tableMode === TableMode.STATIONS) {
                tableSettings.stationColumns = selections;
                options = 'stationColumns';
            }
            if (tableMode === TableMode.DELIVERIES) {
                tableSettings.deliveryColumns = selections;
                options = 'deliveryColumns';
            }

            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: tableSettings
                },
                options: {
                    ...state.options,
                    tableSettingsOption: options
                }
            };

        case TracingActionTypes.SetTableShowType:
            return {
                ...state,
                fclData: {
                    ...state.fclData,
                    tableSettings: {
                        ...state.fclData.tableSettings,
                        showType: action.payload
                    }
                },
                options: {
                    ...state.options,
                    tableSettingsOption: 'showType'
                }
            };

        default:
            return state;
    }
}
