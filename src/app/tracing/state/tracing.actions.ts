import { Action } from '@ngrx/store';
import { VisioReport } from '../visio/layout-engine/datatypes';
import { GraphType, Size, TableMode, FclData, ShowType } from '../util/datatypes';

export enum TracingActionTypes {
    SetTracingActive = '[Tracing] Set Tracing Active',
    LoadFclData = '[Tracing] Load Fcl Data',
    LoadFclDataSuccess = '[Tracing] Load Fcl Data Success',
    LoadFclDataFailure = '[Tracing] Load Fcl Data Failure',
    GenerateVisioLayoutSuccess = '[Tracing] Generate Visio Layout Success',
    ToggleLeftSideBar = '[Tracing] Toggle Left SideBar',
    ToggleRightSideBar = '[Tracing] Toggle Right SideBar',
    SetGraphType = '[Tracing] Set Graph Type',
    SetNodeSize = '[Tracing] Set Node Size',
    SetFontSize = '[Tracing] Set Font Size',
    MergeDeliveries = '[Tracing] Merge Deliveries',
    ShowLegend = '[Tracing] Show Legend',
    ShowZoom = '[Tracing] Show Zoom',
    SetTableMode = '[Tracing] Set Table Mode',
    SetTableColumns = '[Tracing] Set Table Columns',
    SetTableShowType = '[Tracing] Set Table Show Type'
}

export class SetTracingActive implements Action {
    readonly type = TracingActionTypes.SetTracingActive;

    constructor(public payload: boolean) {}
}

export class LoadFclData implements Action {
    readonly type = TracingActionTypes.LoadFclData;

    constructor(public payload: FileList | null) {}
}

export class LoadFclDataSuccess implements Action {
    readonly type = TracingActionTypes.LoadFclDataSuccess;

    constructor(public payload: FclData) {}
}

export class LoadFclDataFailure implements Action {
    readonly type = TracingActionTypes.LoadFclDataFailure;
}

export class GenerateVisioLayoutSuccess implements Action {
    readonly type = TracingActionTypes.GenerateVisioLayoutSuccess;

    constructor(public payload: VisioReport) {}
}

export class ToggleLeftSideBar implements Action {
    readonly type = TracingActionTypes.ToggleLeftSideBar;

    constructor(public payload: boolean) {}
}

export class ToggleRightSideBar implements Action {
    readonly type = TracingActionTypes.ToggleRightSideBar;

    constructor(public payload: boolean) {}
}

export class SetGraphType implements Action {
    readonly type = TracingActionTypes.SetGraphType;

    constructor(public payload: GraphType) {}
}

export class SetNodeSize implements Action {
    readonly type = TracingActionTypes.SetNodeSize;

    constructor(public payload: Size) {}
}

export class SetFontSize implements Action {
    readonly type = TracingActionTypes.SetFontSize;

    constructor(public payload: Size) {}
}

export class MergeDeliveries implements Action {
    readonly type = TracingActionTypes.MergeDeliveries;

    constructor(public payload: boolean) {}
}

export class ShowLegend implements Action {
    readonly type = TracingActionTypes.ShowLegend;

    constructor(public payload: boolean) {}
}

export class ShowZoom implements Action {
    readonly type = TracingActionTypes.ShowZoom;

    constructor(public payload: boolean) {}
}

export class SetTableMode implements Action {
    readonly type = TracingActionTypes.SetTableMode;

    constructor(public payload: TableMode) {}
}

export class SetTableColumns implements Action {
    readonly type = TracingActionTypes.SetTableColumns;

    constructor(public payload: [TableMode, string[]]) {}
}

export class SetTableShowType implements Action {
    readonly type = TracingActionTypes.SetTableShowType;

    constructor(public payload: ShowType) {}
}

export type TracingActions =
      SetTracingActive
    | LoadFclData
    | LoadFclDataSuccess
    | LoadFclDataFailure
    | GenerateVisioLayoutSuccess
    | ToggleLeftSideBar
    | ToggleRightSideBar
    | SetGraphType
    | SetNodeSize
    | SetFontSize
    | MergeDeliveries
    | ShowLegend
    | ShowZoom
    | SetTableMode
    | SetTableColumns
    | SetTableShowType;
