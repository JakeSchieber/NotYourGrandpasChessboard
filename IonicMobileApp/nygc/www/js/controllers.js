angular.module('nygc.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

})

.controller('HomeCtrl', function($scope) {

})

.controller('GameCtrl', function($scope, Socket) {
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
  // request to restart the game.
  $scope.restartGame = function() {
    console.log("request issued to restart game.");
    Socket.emit("restartGame", { });
  }

  var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
  };

  var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);
    
    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
      background = '#696969';
    }

    squareEl.css('background', background);
  };

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
    removeGreySquares();
    
    // see if the move is legal
    var moveRequest = {
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    }
    var move = game.move(moveRequest);
  
    // check for illegal move
    if (move === null) return 'snapback';
    // move was valid, push request to server.
    Socket.emit("moveRequest", { move: moveRequest });
  };

  var onMouseoverSquare = function(square, piece) {
    // If it is not your turn then dont worry about drawing on gray colors.
    if($scope.me != game.turn()) {
      return;
    }
    
    // get list of possible moves for this square
    var moves = game.moves({
      square: square,
      verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
      greySquare(moves[i].to);
    }
  };

  var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
  };

  var onSnapEnd = function() {
    board.position(game.fen());
  };

  $scope.boardInitted = false;
  // Send a board initialization request
  Socket.emit("boardRequest", { });
  // this will be caught by the initialization function below.
  Socket.on("boardInit", function (data) {
		console.log("Board initialization");
        
    var cfg = {
      draggable: true,
      onDragStart: onDragStart,
      onDrop: onDrop,
      onChange: onChange,
      onMouseoutSquare: onMouseoutSquare,
      onMouseoverSquare: onMouseoverSquare,
      onSnapEnd: onSnapEnd,
      pieceTheme: 'lib/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png',
    };
    board = ChessBoard('board', cfg);

    $scope.boardInitted = true;
    handleBoardUpdate(data);
	});
  Socket.on('moveRejected', function(data) {
    // WARNING: On this condition: Whose turn is it?...
    alert('Oops, an error occurred. Your move was rejected from the server, your board will be reset to the current game state.');
    console.log("Move request rejected");
    handleBoardUpdate(data);
  });
  Socket.on("boardUpdate", function (data) {
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
  }
  
})
;
