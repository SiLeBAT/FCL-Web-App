import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MainPageService {
    doSaveImage: EventEmitter<any>;
    doVisioLayout: EventEmitter<any>;
    doOnSave: EventEmitter<any>;
    doInputEmpty: EventEmitter<any>;
    // private tracingActive = false;

    constructor() {
        this.doSaveImage = new EventEmitter<any>();
        this.doVisioLayout = new EventEmitter<any>();
        this.doOnSave = new EventEmitter<any>();
        this.doInputEmpty = new EventEmitter<any>();
    }

    // onToggleLeftSidebar() {
    //     this.doToggleLeftSidebar.emit();
    // }

    // onToggleRightSidebar() {
    //     this.doToggleRightSidebar.emit();
    // }

    onSaveImage() {
        this.doSaveImage.emit();
    }

    onVisioLayout() {
        this.doVisioLayout.emit();
    }

    // onLoad(event) {
    //     this.doOnLoad.emit(event);
    // }

    setInputEmpty() {
        this.doInputEmpty.emit();
    }

    onSave() {
        this.doOnSave.emit();
    }
}
