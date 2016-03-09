/* global StatusBar */

// NYGC App
angular.module('nygc', ['ionic', 'nygc.controllers', 'nywton.chessboard'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('nygc', {
      url: '/nygc',
      abstract: true,
      templateUrl: 'templates/menu.html',
      controller: 'AppCtrl'
    })
    .state('nygc.home', {
      url: '/home',
      views: {
        'menuContent': {
          templateUrl: 'templates/home.html',
          controller: 'HomeCtrl'
        }
      }
    })
    .state('nygc.game', {
      url: '/game',
      views: {
        'menuContent': {
          templateUrl: 'templates/game.html',
          controller: 'GameCtrl'
        }
      }
    });
    
  // if none of the above states are matched, fallback to home
  $urlRouterProvider.otherwise('/nygc/home');
})

// configure the chessboard
.config(['nywtonChessboardConfigProvider', function nywtonChessConfigConfig(chessboardProvider) {
  chessboardProvider.draggable(true)
    .position('start')
    .pieceTheme('lib/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png');
}]);