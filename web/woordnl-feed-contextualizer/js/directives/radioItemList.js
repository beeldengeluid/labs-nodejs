angular.module('woordnl').directive('radioItemList', function() {
	
	return {
		restrict : 'E',

		replace : true,

		link: function ($scope, $element, $attributes) {
			$scope.index = $scope.$eval($attributes.index);
        },

		templateUrl : './woordnl-fc/templates/partials/radioItemList.html'	
	}

});