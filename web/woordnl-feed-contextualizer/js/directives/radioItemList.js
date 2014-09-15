angular.module('woordnl').directive('radioItemList', function() {
	
	return {
		restrict : 'E',

		replace : true,

		link: function ($scope, $element, $attributes) {
			$scope.itemId = $attributes.itemId;
        },

		templateUrl : './woordnl-fc/templates/partials/radioItemList.html'	
	}

});