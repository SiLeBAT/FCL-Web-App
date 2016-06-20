'use strict';

/*global angular */

angular.module('app').service('dataProvider', function() {

    var nodes = [{
        "id": 1,
        "name": "Heckmair Andreas",
        "type": "Kuchenesser"
    }, {
        "id": 3,
        "name": "Voggel Anton",
        "type": "Kuchenesser"
    }, {
        "id": 4,
        "name": "Schaich Peter",
        "type": "Kuchenesser"
    }, {
        "id": 6,
        "name": "Otte",
        "type": "Kuchenesser"
    }, {
        "id": 8,
        "name": "Riedl-Leirer Monika",
        "type": "Primärerzeuger"
    }, {
        "id": 20,
        "name": "Bäcker Mees",
        "type": "Bäcker"
    }, {
        "id": 22,
        "name": "JungMarkt",
        "type": "Supermarkt"
    }, {
        "id": 236,
        "name": "MarktSchleuse",
        "type": "Supermarkt"
    }, {
        "id": 261,
        "name": "Schmidt Fritz",
        "type": "Primärerzeuger"
    }, {
        "id": 346,
        "name": "Albert Benno",
        "type": "Primärerzeuger"
    }, {
        "id": 394,
        "name": "Adolf Roland",
        "type": "Primärerzeuger"
    }, {
        "id": 451,
        "name": "Prophete Hermann",
        "type": "Primärerzeuger"
    }, {
        "id": 598,
        "name": "Baak Helmut",
        "type": "Primärerzeuger"
    }, {
        "id": 640,
        "name": "Alex",
        "type": "Primärerzeuger"
    }, {
        "id": 642,
        "name": "Bio-Lager",
        "type": "Bioladen"
    }, {
        "id": 679,
        "name": "Bäcker Haake",
        "type": "Bäcker"
    }, {
        "id": 740,
        "name": "Mlady  Kurt",
        "type": "Primärerzeuger"
    }, {
        "id": 742,
        "name": "Wolf Bernhard",
        "type": "Primärerzeuger"
    }, {
        "id": 749,
        "name": "Gewürz Arno",
        "type": "Gewürzhändler"
    }, {
        "id": 750,
        "name": "MarktEber",
        "type": "Supermarkt"
    }, {
        "id": 754,
        "name": "Bio Geisler",
        "type": "Bioladen"
    }];

    var edges = [{
        "id": 10001,
        "source": 20,
        "target": 3
    }, {
        "id": 10010,
        "source": 20,
        "target": 4
    }, {
        "id": 10002,
        "source": 22,
        "target": 20
    }, {
        "id": 10011,
        "source": 22,
        "target": 20
    }, {
        "id": 10003,
        "source": 754,
        "target": 20
    }, {
        "id": 10014,
        "source": 236,
        "target": 679
    }, {
        "id": 10004,
        "source": 236,
        "target": 20
    }, {
        "id": 10005,
        "source": 236,
        "target": 20
    }, {
        "id": 10006,
        "source": 236,
        "target": 20
    }, {
        "id": 10007,
        "source": 236,
        "target": 20
    }, {
        "id": 10008,
        "source": 749,
        "target": 20
    }, {
        "id": 10009,
        "source": 3,
        "target": 6
    }, {
        "id": 10012,
        "source": 679,
        "target": 1
    }, {
        "id": 10013,
        "source": 642,
        "target": 679
    }, {
        "id": 10015,
        "source": 750,
        "target": 679
    }, {
        "id": 10019,
        "source": 394,
        "target": 22
    }, {
        "id": 10020,
        "source": 640,
        "target": 754
    }, {
        "id": 10021,
        "source": 598,
        "target": 236
    }, {
        "id": 10022,
        "source": 740,
        "target": 236
    }, {
        "id": 10023,
        "source": 261,
        "target": 236
    }, {
        "id": 10024,
        "source": 346,
        "target": 236
    }, {
        "id": 10028,
        "source": 346,
        "target": 750
    }, {
        "id": 10025,
        "source": 742,
        "target": 749
    }, {
        "id": 10026,
        "source": 8,
        "target": 642
    }, {
        "id": 10027,
        "source": 451,
        "target": 236
    }];

    this.getNodes = function() {
        return nodes;
    };

    this.getEdges = function() {
        return edges;
    };

});