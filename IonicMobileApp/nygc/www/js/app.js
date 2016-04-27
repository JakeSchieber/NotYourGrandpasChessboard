/* global StatusBar */

// NYGC App
angular.module('nygc', ['ionic', 'nygc.controllers', 'nygc.services'])

.run(function($ionicPlatform, Socket) {
  $ionicPlatform.ready(function() {
    // initialize socket.io
    Socket.init();
    
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
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
    })
    .state('nygc.mockboard', {
      url: '/mockboard',
      views: {
        'menuContent': {
          templateUrl: 'templates/mockboard.html',
          controller: 'MockBoardCtrl'
        }
      }
    })
    .state('nygc.connection', {
      url: '/connection',
      views: {
        'menuContent': {
          templateUrl: 'templates/connection.html',
          controller: 'ConCtrl'
        }
      }
    })
    .state('nygc.boardCntrl', {
      url: '/boardController',
      views: {
        'menuContent': {
          templateUrl: 'templates/boardCntrl.html',
          controller: 'BoardCntrlCtrl'
        }
      }
    });
    
  // if none of the above states are matched, fallback to home
  $urlRouterProvider.otherwise('/nygc/home');
})
;