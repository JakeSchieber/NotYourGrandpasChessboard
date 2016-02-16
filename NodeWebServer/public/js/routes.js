angular.module('routes', [])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

	$routeProvider

		.when('/fun', {
			templateUrl: 'views/fun.html',
			controller: 'FunCtrl'
		})
		
		// home page
		.when('/', {
			templateUrl: 'views/home.html'
		});

	$locationProvider.html5Mode(true);

}]);