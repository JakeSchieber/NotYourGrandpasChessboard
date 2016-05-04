angular.module('nygc.controllers', ['ngCordovaBluetoothLE', 'ngCordova'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

})

.controller('HomeCtrl', function($scope) {

})

/**
 * Connection controller
 * Controls the connection with the bluetooth receiver
 * 
 * NOTE: This ought to be exported to a service when the time is correct.
 */
.controller('ConCtrl', function($scope, Bluetooth) {
  // NOTE: We should be able to handle the scanning already in progress error....
  // or just not allow the user to click scan again when alrady scanning...
  
  /**
   * Function to be used to connect to the Bluetooth chip on the NYGC board
   * 
   * TODO: We need this to stop scanning when we find the device that we are looking for 
   * and when we are scanning we should have a loading icon or something so that the user cannot
   * repeatedly click to scan.
   * 
   * Question: Do we have to be scanning in order to connect?...
   * NOTE: Wont matter as long as we stop scanning.
   */
  $scope.connectToNYGC = function() {
    // Initialize the bluetooth on the device and then scan for open devices.
    console.log("ititializing bluetooth");
    Bluetooth.init()
      .then(function(resp) {
        console.log("scanning for devices.");
        // @ this point we can turn on a spinner denoting that the app is looking for connections.
        // This spinner can be turned off on cancel or when the device has been found.
        return Bluetooth.scanForDevice("2140E6E4-2D57-DDA1-9264-1899B8B1CE0D"); // address corresponding to name == "HC-08"
      })
      .then(function(device) {
        console.log("Connecting to bluetooth");
        console.log(device);
        // once the desired device has been found then attempt to connect to it.
        return Bluetooth.connect(device.address);
      })
      .then(function(resp) {
        // now that we are initialized lets get the services.
        console.log("attempting to get the services...");
        return Bluetooth.getCurrentServices();
      })
      .then(function(resp) {
        console.log("made it to the end of the list?...");
        console.log(resp);
      })
      .catch(function(err) {
        console.log("ERROR: unable to initalize Bluetooth.");
      });
  };
  
  /**
   * Function to disconnect from bluetooth.
   */
  $scope.disconnectFromNYGC = function() {
    Bluetooth.disconnect()
      .then(function(resp) {
        console.log("Success, we have disconnected from NYGC.");
        console.log(resp);
      })
      .catch(function(err) {
        console.log("ERROR: unable to disconnect.");
        consioole.log(err);
      });
  }
  
  /**
   * Test current address
   */
  
  /**
   * Check 
   */
})

.controller('GameCtrl', function($scope, Socket, $ionicModal) {
  
  var board,
  game = new Chess();
  
  $scope.colors = ['w', 'b'];
  $scope.fullColors = ['white', 'black'];
  // on page load default current user to white.
  $scope.me = $scope.colors[0];
  // placing is initted inside of the handleBoardInit function
  
  $scope.switchSides = function() {
    // swaps orientation and who is moving. Game logic handles controlling which pieces can be moved, no update to game required.
    $scope.me = ($scope.me == $scope.colors[0]) ? $scope.colors[1] : $scope.colors[0];
    board.orientation(($scope.me == $scope.colors[0]) ? $scope.fullColors[0] : $scope.fullColors[1]);
  }
  
  /**
   * Info modal used at the beginning of games.
   */
  $ionicModal.fromTemplateUrl('templates/modals/infoModal.html', function($ionicModal) {
    $scope.infoModal = $ionicModal;
  }, {
    // Use our scope for the scope of the modal to keep it simple
    scope: $scope,
    // The animation we want to use for the modal entrance
    animation: 'slide-in-up'
  });
  
  // request to restart the game.
  $scope.restartGame = function() {
    console.log("request issued to restart game.");
    Socket.emit("restartGame", { });
  }

  var onDragStart = function(source, piece) {
    // If it is not your turn then dont worry about drawing on gray colors.
    if($scope.me != game.turn()) {
      return false;
    }
    
    // do not pick up pieces if the game is over
    // or if it's not that side's turn
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  };
  
  var onChange = function(oldPos, newPos) {
    $scope.$apply(function() {
      $scope.placing = game.turn();
    });
  }
  
  var onDrop = function(source, target) {
    console.log(source);
    console.log(target);
    
    // see if the move is legal
    var moveRequest = {
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    }
    var move = game.move(moveRequest);
    if(isGameOver(false)) {
      return;
    }
    
    // check for illegal move
    if (move === null) return 'snapback';
    // move was valid, push request to server.
    Socket.emit("moveRequest", { move: moveRequest });
  };

  var onSnapEnd = function() {
    board.position(game.fen());
  };
  
  Socket.emit('setToGameDemo', {});
  $scope.gameboardInitted = false;
  Socket.on("boardInit", function (data) {
		console.log("Game board initialization");
    game = new Chess(data.boardFen);
    
    var cfg = {
      draggable: true,
      onDragStart: onDragStart,
      onDrop: onDrop,
      onChange: onChange,
      onSnapEnd: onSnapEnd,
      pieceTheme: 'lib/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png',
    };
    board = ChessBoard('demoboard', cfg);
    handleBoardUpdate(data);
    
    $scope.$apply(function() {      
      $scope.gameboardInitted = true;
      console.log("the turn is: " + data.turn);
      $scope.placing = data.turn;
    });
  });
    
  
  Socket.on('moveRejected', function(data) {
    // WARNING: On this condition: Whose turn is it?...
    alert('Oops, an error occurred. Your move was rejected from the server, your board will be reset to the current game state.');
    console.log("Move request rejected");
    handleBoardUpdate(data);
  });
  Socket.on("boardUpdate", function (data) {
    console.log("request to update the board.");
    console.log(data);
    handleBoardUpdate(data);
	});
  
  /**
   * Handles an update of the board and local scope.
   * Note: If this is triggered by a socket then you must place inside $rootsScope.$apply()
   */
  function handleBoardUpdate(gameUpdate) {
    /* More efficient version, handle just a move, but we dont care about efficiency...
    // sets the board and all $scoped variables required by a board Update
    board.position(gameUpdate.boardFen); *
    if(gameUpdate.move) {
      console.log("handle board move.");
      var move = game.move(gameUpdate.move);
      if(!move) {
        alert("Oops, an error occurred. Your move was rejected");
      }
    } else {
      console.log("handle board load.");
      game.load(gameUpdate.boardFen);
    }
    $scope.$apply(function() {
      $scope.placing = gameUpdate.turn;
    });
    */
    // sets the board and all $scoped variables required by a board Update
    // safer bet, cant get off track with board moves.
    board.position(gameUpdate.boardFen);
    // temp hack, just always load in the full board.
    game.load(gameUpdate.boardFen);
    $scope.$apply(function() {
      $scope.placing = gameUpdate.turn;
    });
    
    if(isGameOver(false)) {
      return;
    }
  }
  
  // INFO MODAL FUNCTIONS
  $scope.openInfoModal = function() {
    
    // sometimes the socket goes off before the page is finished initializing. If so wait until modal is created.
    if(!$scope.infoModal || !$scope.infoModal.show) {
      setTimeout(function(){
        $scope.openInfoModal()
      }, 10);
      return;
    }
    
    $scope.infoModal.show();
  };
  $scope.closeInfoModal = function() {
    // THIS NEEDS TO BE UPDATED IF WE EVER CLOSE THE MODAL FROM ANYWHERE BUT FROM THE MODAL ITSELF
    // this says that immediately when the info modal is closed that we should verify board position.
    $scope.infoModal.hide();
  };
  // restart game request triggered from the info modal.
  $scope.infoModalRestartGame = function() {
    // WARNING: We are now waiting for the board and the server logic to merge here... if we trigger the restart
    // @ what point will we next compare the boards with mockboard?...
    // We might want to force the mockboard poll to 
    
    
    // Restart
    // Instead on reset we are going to force the user to reset the board by themselves.
    // On game restart should we show the welcome message?....
    
    // Currently clicking reset on the app resets the mockboard... We do not want this. We want to trigger a board reset by user force.
    $scope.gameOver = false;
    $scope.win = false;
        
    $scope.closeInfoModal();
    $scope.restartGame();
  }
  $scope.$on('$destroy', function() {
    $scope.infoModal.remove();
  });

  function isGameOver(checkIsFromPlayer) {
    if(game.game_over()) {
      $scope.gameOver = true;
      $scope.win = checkIsFromPlayer;
      $scope.openInfoModal();
      return true;
    }
    return false;
  }
})
;
