'use strict';

/*global angular*/

angular.module('app').controller('GraphCtrl', ['$scope', 'dataProvider', 'graph', function($scope, dataProvider, graph) {

  graph(dataProvider.getNodes(), dataProvider.getEdges()).then(function(cy) {
    $scope.cyLoaded = true;
  });

  $scope.nodeSize = 50;
  $scope.sizes = {
    Small: 50,
    Large: 100
  };

  $scope.onNodeSizeChange = function() {
    graph.setNodeSize($scope.nodeSize);
  };

}]);