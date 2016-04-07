angular.module('nygc.services', [])
.factory('Socket', ['$window', function($rootScope, $window) {
	var socket;
  var initted = false;
	
  return {
    init: function() {
      // io included as global from socket.io import
      console.log("Initializing socket.");
      socket = io.connect('http://jacobschieber.com:8085');// io.connect('http://localhost:8085');
      initted = true;
    },
    initted: function() {
      return initted;
    },
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