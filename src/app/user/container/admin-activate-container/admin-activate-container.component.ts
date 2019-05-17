import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { UserService } from '../../services/user.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';
import { SpinnerLoaderService } from '../../../shared/services/spinner-loader.service';
import { AdminActivateResponseDTO } from './../../models/user.model';

@Component({
    selector: 'fcl-admin-activate-container',
    templateUrl: './admin-activate-container.component.html'
})
export class AdminActivateContainerComponent implements OnInit {
    adminTokenValid: boolean;
    name: string;
    appName: string = environment.appName;

    constructor(private activatedRoute: ActivatedRoute,
        private userService: UserService,
        private alertService: AlertService,
        private spinnerService: SpinnerLoaderService) { }

    ngOnInit() {
        const adminToken = this.activatedRoute.snapshot.params['id'];

        this.spinnerService.show();
        this.userService.adminActivateAccount(adminToken)
        .subscribe((adminActivateResponse: AdminActivateResponseDTO) => {
            this.spinnerService.hide();
            const message = adminActivateResponse.title;
            this.name = adminActivateResponse.name;
            this.alertService.success(message);
            this.adminTokenValid = true;
        }, (err: HttpErrorResponse) => {
            this.spinnerService.hide();
            this.alertService.error(err.error.title);
            this.adminTokenValid = false;
        });
    }

}