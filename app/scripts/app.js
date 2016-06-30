'use strict';

/*global angular*/

angular.module('app', ['ngMaterial']).config(function($mdIconProvider, $mdThemingProvider) {

    $mdIconProvider.icon('menu', './icons/ic_menu_white_24px.svg', 24);

    $mdThemingProvider.theme('default').primaryPalette('indigo').accentPalette('blue');

});
