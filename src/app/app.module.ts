import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app.routing.module';
import { NgModule } from '@angular/core';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';

import { UserModule } from './user/user.module';

import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { MainPageModule } from './main-page/main-page.module';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MainPageModule,
        UserModule,
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
        StoreDevtoolsModule.instrument({
            name: 'FCL Devtools',
            maxAge: 25,
            logOnly: environment.production
        }),
        // AppRoutingModule needs to be at the end
        AppRoutingModule
    ],
    providers: [
        {
            provide: LocationStrategy,
            useClass: HashLocationStrategy
        }
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule {
}
