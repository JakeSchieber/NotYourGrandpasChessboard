angular.module('routes', [])

// config the angular app
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  
  // Not working with current version of angular.
  //$locationProvider.html5Mode(true);
  
	$routeProvider
		.when('/', {
			templateUrl: 'views/home.html'
		})
		.when('/game', {
			templateUrl: 'views/game.html',
      controller: 'GameCtrl'
		})
    .when('/mockboard', {
			templateUrl: 'views/mockboard.html',
      controller: 'MockBoardCtrl'
		})
    // go to index on no match
    .otherwise({ redirectTo: '/' });
}])
;