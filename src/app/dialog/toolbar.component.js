'use strict';

/*global angular*/

angular.module('app').component('dialogToolbar', {
    bindings: {
        title: '@',
        closable: '<'
    },
    controller: function($mdDialog) {
        var _this = this;

        _this.closeDialog = function() {
            $mdDialog.cancel();
        };
    },
    templateUrl: 'app/dialog/toolbar.component.html'
});
