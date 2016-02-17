angular.module('routes', ['nywton.chessboard'])
// config the angular app
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
}])

// config the chessboard
.config(['nywtonChessboardConfigProvider', function nywtonChessConfigConfig(chessboardProvider) {
  chessboardProvider.draggable(true)
    .position('start')
    .pieceTheme('libs/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png');
}]);