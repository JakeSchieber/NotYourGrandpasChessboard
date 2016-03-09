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
    // go to index on no match
    .otherwise({ redirectTo: '/' });
	
}])

/*
// $inject: 'nywton.chessboard'
// config the chessboard
.config(['nywtonChessboardConfigProvider', function nywtonChessConfigConfig(chessboardProvider) {
  
  var hold = chessboardProvider.draggable(true)
    .position('start')
    .pieceTheme('libs/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png');
  
  chessboardProvider.onChange = function() {
    alert();
  }
  console.log(chessboardProvider);
}])
*/
;