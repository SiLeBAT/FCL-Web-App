import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatRadioModule,
    MatSelectModule,
    MatSidenavModule,
    MatSliderModule,
    MatToolbarModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatSnackBarModule,
    MAT_LABEL_GLOBAL_OPTIONS,
    MatTooltipModule
} from '@angular/material';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@NgModule({
    imports: [],
    exports: [
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatDialogModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatRadioModule,
        MatSelectModule,
        MatSidenavModule,
        MatSliderModule,
        MatToolbarModule,
        MatDividerModule,
        MatExpansionModule,
        MatProgressSpinnerModule,
        MatGridListModule,
        MatSnackBarModule,
        MatTooltipModule
    ],
    providers: [{
        provide: MAT_LABEL_GLOBAL_OPTIONS,
        useValue: { float: 'auto' }
    }]
})
export class MaterialModule {}
