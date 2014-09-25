angular.module('woordnl').directive('feedList', function() {

	return {
	
		restrict : 'E',

		replace : true,

		templateUrl : './woordnl-fc/templates/partials/feedList.html'
	}

});