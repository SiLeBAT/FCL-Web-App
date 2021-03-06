import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'fcl-rule-service-view',
    templateUrl: './rule-service-view.component.html',
    styleUrls: ['./rule-service-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuleServiceViewComponent {

    @Output() addSelection = new EventEmitter<void>();
    @Output() removeSelection = new EventEmitter<void>();

    constructor() { }

    onAddSelectionClick(): void {
        this.addSelection.emit();
    }

    onRemoveSelectionClick(): void {
        this.removeSelection.emit();
    }
}
