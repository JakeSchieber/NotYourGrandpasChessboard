angular.module('controllers')
.controller('MockBoardCtrl', ['$scope', 'Socket', '$rootScope', '$timeout', function($scope, Socket, $rootScope, $timeout) {
  
  var board;
  
  // Rotate the board, dont manage anything having to do with the 'me' variable on the mockboard
  $scope.fullColors = ['white', 'black'];
  $scope.whiteOrientation = true;
  $scope.switchSides = function() {
    $scope.whiteOrientation = !$scope.whiteOrientation;
    board.orientation($scope.whiteOrientation ? $scope.fullColors[0] : $scope.fullColors[1]);
  }
  
  // request to restart the game.
  $scope.restartGame = function() {
    console.log("force reset the board.");
    // Socket.emit("restartGame", { });
    // to keep constant, we just manually move all of the pieces back to start then trigger the user onDrop event.
    board.position('start');
    onDrop(null, null);
  }

  // onDrop function to be called when a change to the board is made.
  var onDrop = function(source, target) {
    // Note: All move validation has been removed because we are trying to representing a real board here.
    // Mockboard does not submit a move request, it submits a completely new board.
    
    // just add a bit of a delay so that the onDrop event has finished and the position has been updated
    // onMoveEnd does not appear to be working right now.
    console.log("update mockboard request sent.");
    //console.log( bitmapFromBoard(board));
    
    $timeout(function() {
      Socket.emit("updateMockboard", { 
        boardFen: board.fen(),
        boardBitmap: bitmapFromBoard(board)
      });
    }, 5);
  };
  
  // request board and then catch it.
  $scope.boardInitted = false;
  Socket.emit('setToMockboard', { });
  Socket.on("boardInit", function (data) {
		console.log("Mock Board initialization");
    $scope.$apply(function() {
      $scope.boardInitted = true;  
      var cfg = {
        draggable: true,
        onDrop: onDrop,
        dropOffBoard: 'trash',
        sparePieces: true,
        pieceTheme: 'libs/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png',
      };
      board = ChessBoard('board', cfg);
      handleBoardUpdate(data);
    });
	});
  
  // Someone else on the same socked updated the board, make it so on our board as well.
  Socket.on("boardUpdate", function (data) {
    console.log("boardUpdate request received");
    console.log(data);
    handleBoardUpdate(data);
	});
  
  // Our opponent playing on /game made a boardUpdate request.
  Socket.on("boardUpdateFromRealGame", function (data) {
    console.log("boardUpdateFromRealGame request received");
    console.log(data);
    handleBoardUpdate(data);
	});
  
  /**
   * Handles an update of the board and local scope.
   * Note: If this is triggered by a socket then you must place inside $rootsScope.$apply()
   */
  function handleBoardUpdate(gameUpdate) {
    // sets the new board
    board.position(gameUpdate.boardFen);
  }
}]);

/**
 * Returns the bitmap corresponding to the board.
 * NOTE: the bit map has row 1 mapped at 0 and row 8 mapped at 9,
 *  the visual display reverses this by default and has row 0 at the
 *  bottom of the screen set while set to white's persepective.
 */
function bitmapFromBoard(board) {
  var boardBitmap = [0, 0, 0, 0, 0, 0, 0, 0];
  for (var property in board.position()) {
    if (board.position().hasOwnProperty(property)) {
      var row = parseInt(property.charAt(1));
      var col;
      switch(property.charAt(0)) {
        case 'a':
          col = 0;
          break;
        case 'b':
          col = 1;
          break;
        case 'c':
          col = 2;
          break;
        case 'd':
          col = 3;
          break;
        case 'e':
          col = 4;
          break;
        case 'f':
          col = 5;
          break;
        case 'g':
          col = 6;
          break;
        case 'h':
          col = 7;
      }
      boardBitmap[row - 1] = boardBitmap[row - 1] | Math.pow(2, 7 - col); 
    }
  }
  return boardBitmap;
}