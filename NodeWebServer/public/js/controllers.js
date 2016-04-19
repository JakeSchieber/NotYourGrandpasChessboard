angular.module('controllers', [])
.controller('FunCtrl', function($scope, Socket, $rootScope) {

  console.log("Get it");
  
	$scope.pushed = function() {
		console.log("I have been pushed");
    
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
  
  Socket.on("boardUpdate", function (data) {
		alert("Board has been updated.");
		// if you want to change the scope then you need to put inside apply
		$rootScope.$apply(function () {
			// alert("msg received from socket!");
			console.log('data received');
			console.log(data);
		});
	});
  
  
  $scope.test = function() {
    alert("Got it.");
  }
})
;