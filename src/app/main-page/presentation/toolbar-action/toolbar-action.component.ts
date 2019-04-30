import { Component, OnInit, Output, EventEmitter, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { UserService } from '../../../user/services/user.service';
import { MainPageService } from '../../services/main-page.service';
import * as _ from 'lodash';

@Component({
    selector: 'fcl-toolbar-action',
    templateUrl: './toolbar-action.component.html',
    styleUrls: ['./toolbar-action.component.scss']
})
export class ToolbarActionComponent implements OnInit {
    @ViewChild('fileInput') fileInput: ElementRef;

    @Input() tracingActive: boolean;
    @Output() toggleRightSidebar = new EventEmitter<boolean>();
    @Output() uploadFile = new EventEmitter<FileList>();
    @Output() exampleData = new EventEmitter();
    subscriptions = [];
    private rightOpen: boolean = false;

    constructor(
        private userService: UserService,
        private mainPageService: MainPageService
    ) { }

    ngOnInit() {
        this.subscriptions.push(
            this.mainPageService.doInputEmpty.subscribe(
                () => {
                    this.setInputEmpty();
                },
                error => {
                    throw new Error(`error making input element empty: ${error}`);
                }
            )
        );
    }

    isServerLess(): boolean {
        return environment.serverless;
    }

    onToggleRightSidebar() {
        this.rightOpen = !this.rightOpen;
        console.log('ToolbarActionComponent, onToggleRightSidebar, this.rightOpen: ', this.rightOpen);
        this.toggleRightSidebar.emit(this.rightOpen);
    }

    onLoad(event$) {
        const fileList: FileList = event$.target.files;
        this.uploadFile.emit(fileList);
    }

    loadExample() {
        this.exampleData.emit();
    }

    setInputEmpty() {
        console.log('setInputEmpty()');
        (this.fileInput.nativeElement as HTMLInputElement).value = '';
    }
}
