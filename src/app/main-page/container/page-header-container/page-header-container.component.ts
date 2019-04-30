import { Component, OnInit, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Store, select } from '@ngrx/store';
import * as fromTracing from '../../../tracing/state/tracing.reducers';
import * as tracingActions from '../../../tracing/state/tracing.actions';
import { takeWhile } from 'rxjs/operators';

@Component({
    selector: 'fcl-page-header-container',
    templateUrl: './page-header-container.component.html',
    styleUrls: ['./page-header-container.component.scss']
})
export class PageHeaderContainerComponent implements OnInit, OnDestroy {
    appName = environment.appName;
    tracingActive: boolean;
    private componentActive: boolean = true;

    constructor(private store: Store<fromTracing.State>) { }

    ngOnInit() {
        this.store.pipe(
            select(fromTracing.getTracingActive),
            takeWhile(() => this.componentActive)
          ).subscribe(
              (tracingActive: boolean) => {
                  this.tracingActive = tracingActive;
              },
              (error) => {
                  throw new Error(`error loading tracing state: ${error}`);
              }
          );

    }

    toggleLeftSideBar(open: boolean) {
        this.store.dispatch(new tracingActions.ToggleLeftSideBar(open));
    }

    ngOnDestroy() {
        this.componentActive = false;
    }
}
