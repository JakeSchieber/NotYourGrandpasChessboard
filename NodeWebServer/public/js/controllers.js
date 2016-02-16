angular.module('controllers', [])
.controller('FunCtrl', function($scope, Socket, $rootScope) {

	$scope.pushed = function() {
		var data = 'testData';
		
		// can look into acknowledgements here if you want to verify that the server received.
		Socket.emit("chat message", data);
	}
	
	Socket.on("chat message", function (data) {
		
		// if you want to change the scope then you need to put inside apply
		$rootScope.$apply(function () {
			// alert("msg received from socket!");
			console.log('data received');
			console.log(data);
		});
	});

})
;