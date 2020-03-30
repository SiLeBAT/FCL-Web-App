import { Action } from '@ngrx/store';

export enum IOActionTypes {
    LoadFclDataMSA = '[Tracing][IO] Load Fcl Data',
    LoadShapeFileMSA = '[Tracing][IO] Load Shape File',
    SaveFclDataMSA = '[Tracing][IO] Save Fcl Data',
    SaveGraphImageMSA = '[Tracing][IO] Save Graph Image'
}

export class LoadFclDataMSA implements Action {
    readonly type = IOActionTypes.LoadFclDataMSA;

    constructor(public payload: { dataSource: FileList | null }) {}
}

export class LoadShapeFileMSA implements Action {
    readonly type = IOActionTypes.LoadShapeFileMSA;

    constructor(public payload: { dataSource: FileList | null }) {}
}

export class SaveFclDataMSA implements Action {
    readonly type = IOActionTypes.SaveFclDataMSA;

    constructor(public payload: { fileName?: string }) {}
}

export class SaveGraphImageMSA implements Action {
    readonly type = IOActionTypes.SaveGraphImageMSA;

    constructor(public payload: { canvas: any }) {}
}

export type IOActions =
      LoadFclDataMSA
    | SaveFclDataMSA
    | SaveGraphImageMSA;
