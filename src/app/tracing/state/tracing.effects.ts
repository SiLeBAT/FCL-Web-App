import { Observable } from 'rxjs/Rx';
import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { AlertService } from '../../shared/services/alert.service';

import * as tracingActions from './tracing.actions';
import * as fromTracing from './tracing.reducers';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { DataService } from '../services/data.service';
import { FclData } from '../util/datatypes';
import { Store } from '@ngrx/store';
import { MainPageService } from '../../main-page/services/main-page.service';

@Injectable()
export class TracingEffects {
    constructor(
        private actions$: Actions,
        private dataService: DataService,
        private alertService: AlertService,
        private mainPageService: MainPageService,
        private store: Store<fromTracing.State>
    ) {}

    @Effect()
    loadFclData$ = this.actions$.pipe(
        ofType<tracingActions.LoadFclData>(tracingActions.TracingActionTypes.LoadFclData),
        mergeMap(action => {
            const fileList: FileList = action.payload;
            // this.mainPageService.setInputEmpty();
            if (fileList.length === 1) {
                this.dataService.setDataSource(fileList[0]);
                return Observable.fromPromise(this.dataService.getData()).pipe(
                    map((data: FclData) => new tracingActions.LoadFclDataSuccess(data)),
                    catchError((error) => {
                        this.alertService.error(`Please select a .json file with the correct format!, error: ${error}`);
                        // this.mainPageService.setInputEmpty();
                        return of(new tracingActions.LoadFclDataFailure());
                    })
                );
            } else {
                this.alertService.error('Please select a .json file with the correct format!');
                this.store.dispatch(new tracingActions.LoadFclDataFailure());
            }
        }),
        catchError((error) => {
            this.alertService.error(`Please select a .json file with the correct format!, error: ${error}`);
            // this.mainPageService.setInputEmpty();
            return of(new tracingActions.LoadFclDataFailure());
        })
    );
}
