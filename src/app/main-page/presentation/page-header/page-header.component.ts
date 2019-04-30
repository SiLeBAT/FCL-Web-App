import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { UserService } from '../../../user/services/user.service';

@Component({
    selector: 'fcl-page-header',
    templateUrl: './page-header.component.html',
    styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent implements OnInit {
    @Input() appName: string;
    @Input() tracingActive: boolean;
    @Output() toggleLeftSideBar = new EventEmitter<boolean>();
    private leftOpen: boolean = false;

    constructor(private userService: UserService) { }

    ngOnInit() {
    }

    onToggleLeftSidebar() {
        this.leftOpen = !this.leftOpen;
        this.toggleLeftSideBar.emit(this.leftOpen);
    }

    isServerLess(): boolean {
        return environment.serverless;
    }

}
