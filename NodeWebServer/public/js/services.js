/* global io */
angular.module('services', [])
.factory('Socket', ['$window', function($rootScope, $window) {

	// io included as global from socket.io import
	var socket = io.connect('http://localhost:8080');

	return {
		on : function(eventName, callback) {
			/*
				If you are applying a change to scope you neet to use $rootScope.$apply(function() {})
				
				callback should be called with 1 parameter, data, which contains the socket response.
			*/
			socket.on(eventName, callback);
		},
		emit : function(eventName, data) {
			socket.emit(eventName, data);
		}
	}

}]);