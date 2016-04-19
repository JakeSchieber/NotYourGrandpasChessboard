angular.module('nygc.controllers')

.controller('MockBoardCtrl', function($scope, Socket, $ionicModal) {
  /**
   * Scoped game variables
   */
  var board, boardFen, boardBitmap;
  $scope.colors = ['w', 'b'];
  $scope.fullColors = ['white', 'black'];
  $scope.me = $scope.colors[0];
  
  /**
   * Alert modal used on user errors.
   */
  $ionicModal.fromTemplateUrl('templates/modals/alertModal.html', function($ionicModal) {
    $scope.modal = $ionicModal;
  }, {
    // Use our scope for the scope of the modal to keep it simple
    scope: $scope,
    // The animation we want to use for the modal entrance
    animation: 'slide-in-up'
  });
  
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
  
  
  /**
   * Switch board sides.
   * NOTE: This method
   */
  $scope.switchSides = function() {
    // swaps orientation and who is moving. Game logic handles controlling which pieces can be moved, no update to game required.
    $scope.me = ($scope.me == $scope.colors[0]) ? $scope.colors[1] : $scope.colors[0];
    if(board) {
      board.orientation(($scope.me == $scope.colors[0]) ? $scope.fullColors[0] : $scope.fullColors[1]);
    }
  }
  
  /**
   * Should be called whenever you nexed to alternate in the scope whose turn it is.
   */
  $scope.switchTurns = function() {
    $scope.placing = ($scope.placing == $scope.colors[0]) ? $scope.colors[1] : $scope.colors[0];
  }
  /**
   * Used to force the reset to white turn
   * NOTE: Send no param as default set to white.
   */
  $scope.resetTurns = function(resetToBlack) {
    if(resetToBlack) {
      $scope.placing = $scope.colors[1];
      return;
    }
    $scope.placing = $scope.colors[0];
  }
  /**
   * Request to restart the mockboard game.
   */
  $scope.restartGame = function() {
    console.log("request issued to restart game.");
    Socket.emit("restartGame", { });
    
    // reset the gameBoard and tell user to reset the pieces
    $scope.activeChessGame = new Chess(); // new chess game
    compareMockToGame("User requested to reset the game.");
    
    // We are choosing at this moment to forgo showing a welcome message on restart of the game.
    
    // WARINING: We do not handle board restarts well though...
  }

  /**
   * Handler to load the mockboard initialization poll.
   */
  $scope.mockboardInitted = false;
  $scope.gameInProgress = false;
  Socket.on("mockboardInit", function (data) {
    console.log("Mockboard initialization");
    // create the chessboard.js board on screen.
    var cfg = {
      draggable: false,
      pieceTheme: 'lib/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png',
    };
    // board = ChessBoard('mockboard', cfg);
    
    // must be called first because handleBoardUpdate sets the global board variables.
    handleBoardUpdate(data, true, false);
    
    $scope.$apply(function() {
      $scope.mockboardInitted = true;
      joinInittedBoards();
    });
	});
  
  /**
   * On controller load subscribe to the mockboard poll.
   */
  Socket.emit("subscribeToMockboardPoll", { });
  
  /**
   * Mockboard poll handler function
   */
  Socket.on("mockboardPoll", function(data) {
    if(boardFen != data.boardFen) {
      console.log("A change from mockboard has occurred");
      handleBoardUpdate(data, false, true);
      
      // need to call compare so that we can trigger the close action on resolved.
      if($scope.compareBoardFlag) {
        // no message needed since this will only cause the close modal action.
        compareMockToGame();
      }
    }
  });
  
  // request game board and then catch it.
  // Socket.emit('boardRequest', { });
  Socket.emit('setToGameDemo', {});
  $scope.activeChessGame;
  $scope.gameboardInitted = false;
  Socket.on("boardInit", function (data) {
		console.log("Game board initialization");
    $scope.activeChessGame = new Chess(data.boardFen);
        
    $scope.$apply(function() {
      $scope.gameboardInitted = true;
      $scope.placing = data.turn;
      joinInittedBoards();
    });
    
    // so here we need to force the user to reset the board to the required position.
    // open modal if the board is not properly set...
    // $scope.openModal();
    
    // the problem here is that we do not know the order of the initialization
	});
  /**
   * Received when we attempt to make a move and the server rejects it.
   */
  Socket.on('moveRejected', function(data) {
    console.log("Move request rejected");
    $scope.$apply(function() {
      // update the chess.js logic for the game.
      $scope.activeChessGame = new Chess(data.boardFen);
      // If our move is rejected then we have to switch back to our turn.
      $scope.switchTurns();
      // update the board on the screen.
      handleBoardUpdate(data, false, false);
      // Now force that the user reset the board back to the expected condition
      compareMockToGame("Oops, your move has been rejected by the server (this should not have happened...)");
    });
  });
  /**
   * Received when an oponent makes a move on the gameboard.
   */
  Socket.on("boardUpdate", function (data) {
    console.log("request to update the board.");
    $scope.$apply(function() {
      // if a reset request then force the user to reset their board.
      if(data.isReset) {
        console.log("request is a reset, force reset condition.");
        $scope.activeChessGame = new Chess(); // new chess game
        // Note: We should add a flag here so that we can make a unique message in the alert window.
        compareMockToGame("Opponent requested to reset the game.");
        return;
      }
    
      // assume that whenever we receive a board update from the server that a move was made by the opponent
      // and that it is now our turn.
      
      // update the chess.js logic for the game.
      $scope.activeChessGame = new Chess(data.boardFen);
      // switch the labels specifing whose turn it is.
      $scope.switchTurns();
      // update the board on the screen.
      // NOTE: isReset flag sent inside of data now.
      console.log(data);
      handleBoardUpdate(data,false, false);
      
      // ISSUE MOVE UPDATE TO THE BOARD...
      
      // NOTE: In real life, we need to now wait here until the motor is finished moving before
      // we can start issuing future move requests.
      
      // issue request to update the mockboard on the website.
      Socket.emit("forceUpdateMockboard", data);
    });
	});
  
  /**
   * Called immediately after the mockboard and the gameboard are initialized.
   * This will be called by both but wait until both boards are initialized before it will be executed.
   */
  function joinInittedBoards() {
    if(!$scope.mockboardInitted || !$scope.gameboardInitted) {
      // console.log("skipping compare because both boards are not yet initted.");
      return;
    }
    
    // check if the initted board is in the starting position. If it is then no game is in progress
    $scope.gameInProgress = !($scope.activeChessGame.fen().split(" ")[0] == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
    // welcome the user (inProgress denotes welcome or continue message in modal.)
    $scope.openInfoModal();
    
    console.log("in progress?");
    console.log($scope.activeChessGame.fen());
    console.log($scope.gameInProgress);
  }
  
  /**
   * Compares the mockboard to the game and forces that they match. If they dont it will cause the alert modal
   * to appear which will not go away until the user updates the mockboard to match the current game board.
   */
  $scope.compareBoardFlag = false;
  function compareMockToGame(errorMessage) {
    var boardsMatch = $scope.activeChessGame.fen().split(" ")[0] == boardFen.split(" ")[0];
    // if the boards do not match then enter the stage where we continue checking until they do...
    // Force user to fix the problem. Hide the error modal when problem resolved.
    if(!boardsMatch && !$scope.compareBoardFlag) {
      console.log("Boards do not match, force wait until they do...");
      
      // NOTE: This should only happen on initialization of the board....
      
      $scope.errorMessage = errorMessage;
      $scope.openModal();
    } else if(boardsMatch && $scope.compareBoardFlag){
      console.log("Board mismatch error has been resolved.");
      $scope.closeModal();
    } else if(boardsMatch && !$scope.compareBoardFlag){
      console.log("Initialized boards match.")
    }
    // will be set low when the error is finally resolved.
    $scope.compareBoardFlag = !boardsMatch;
  }
  
  /**
   * Handles an update of the board and local scope.
   * Note: If this is triggered by a socket then you must place inside $rootsScope.$apply()
   * 
   * The app is the companion... It knows what the last valid configuration was.
   * 
   * NOTE: validateMove only high on sensing changes from the mockboard poll.
   */
  function handleBoardUpdate(gameUpdate, isInit, validateMove) {
    // if the board bitmap has been set before, meaning that this update is a move and not the initialization.
    // NOTE: on board reset we simply re-init the board, dont want to handle any moves...
    if(!isInit && !gameUpdate.isReset){
      // NOTE: must be before the move is validated, else we will not reset to the proper location.
      var origBoardFen = boardFen;
      boardFen = gameUpdate.boardFen;
      
      // Move validation does not need to be performed if move is either from the server (not made by me)
      // or if they are made when the compareBoardFlag is high (meaning that we are in the process of resetting the board)
      if(!$scope.compareBoardFlag && ($scope.placing == $scope.me) && validateMove) {
        console.log("validating move");
        console.log(boardBitmap);
        
        var move = getMove(boardBitmap, gameUpdate.boardBitmap);
        // should we return false here to denote whether or not to update the board?...
        handleMove(move, origBoardFen);  
      }
      
      // Some updates have a move, but not a bitmap (those sent from opponent)
      // for these users we have to convert the move
      if(gameUpdate.boardBitmap) {
        boardBitmap = gameUpdate.boardBitmap;
      } else {
        console.log("update the boardbitmap");
        boardBitmap = updateBitmapFromMove(boardBitmap, gameUpdate.move);
      }
    } else {      
      console.log("we are initting...");
      console.log(gameUpdate);
      boardFen = gameUpdate.boardFen;
      boardBitmap = gameUpdate.boardBitmap;
    }
    
    if(gameUpdate.isReset) {
      console.log("Reset is high, reset the turns.");
      $scope.resetTurns();
    }
    
    // NOTE: This has temporarily been disabled because we no longer want to display the mockboard on the home screen.
    if(board) {
      // update the actual gameboard displayed on the screen.
      board.position(gameUpdate.boardFen);
    }
  }
  
  /**
   * Handles the game logic corresponding to a series of moves.
   * 
   * Return: true or false relating to whether a valid move has been made or not.
   * 
   * NOTE: This function is not called during the compareMockToGame period.
   * 
   * Params:
   * move - the output of function getMove, so an array of 1 or 2 board locations representing what has changed
   * between the starting and ending set ups of the board.
   * 
   * origBoardFen - the original board Fen before a move was initiated. Required on the start of a move sequence.
   */
  var lastKnownValidBoard;
  $scope.moveSequenceAr;
  function handleMove(move, origBoardFen) {        
    // Init variables responsible for creating a move sequence if not yet initted
    if(!lastKnownValidBoard) {
      if($scope.moveSequenceAr && $scope.moveSequenceAr.length > 0) {
        console.log("Oops, an error has occurred. Moves have been made but no known board configuration.");
        return;
      }
      if(!origBoardFen) {
        console.log("Oops, an error has occurred. Move sequence started but no origBoardFen sent.");
        return;
      }
      // need to reset the board 
      lastKnownValidBoard = new Chess(origBoardFen);
      $scope.moveSequenceAr = [];
    }
    
    // validate the move array.
    if(move.length == 0 || move.length > 2) {
      // to many or too few moves made. (move array will be 0 if getMove couldnt parse the move.)
      console.log("Oops, an improper number of pieces have been moved. Please reset the board to the last known position.");
      compareMockToGame("An improper number of pieces have been moved.");
      return;
    } // else 1 or 2 move locations.
    
    
    /**
     * So there are a few things that can happen:
     * A piece can be picked up
     * A piece can be replaced
     * 
     * The piece which we are moving can be picked up first
     * The piece which we are attacking can be removed first
     * 
     * We can pick up a piece that we want to move. Drag off board and then place onto board where we want to place it.
     * Is there a flag in the move which on move.length of 1 we know if a piece was placed or removed? Because that would make
     * logic pretty obvious.
     * 
     * Here each element in the moveAr now have a location and an action: ['up', 'down'] denoting whether the piece was
     * picked up or removed.
     */
    
    console.log(move);
    
    var attemptedMove, moveAttempted;
    if($scope.moveSequenceAr.length == 0 && move.length == 2) {
      // No move sequence started, but complete move has been made
      // this represents the situation where a piece is simply advanced on the board (no attack)
      attemptedMove = $scope.activeChessGame.move({ from: move[0].location, to: move[1].location });
      moveAttempted = true;
    } else if ($scope.moveSequenceAr.length == 0 && move.length == 1) {
      // if we have not started a move sequence and if this is only one move in a sequence log the move and wait for the next
      
    } else if($scope.moveSequenceAr.length == 1 && move.length == 2) {
      /**
       * If we have already started a move sequence and if a complete move has been made.
       * 
       * USE CASE: User picks up the piece that they want to take, then move the attacking piece
       * to that same "taken" location
       */
    } else if($scope.moveSequenceAr.length == 2 && move.length == 1) {
      /**
       * If we have 2 moves in the current sequence and the user places a piece down
       * 
       * USE CASE: User picks up their piece and the piece that they want to take, then places their
       * own piece onto the piece of the boad which they are "taking"
       */
    } else {
      console.log("Oops, the requested move does not work with the current sequence... How would you like to proceed?");
      console.log(move);
      console.log($scope.moveSequenceAr);
      compareMockToGame("Invalid move sequence detected.");
      return;
    }
    
    if(!moveAttempted) {
      // no move attempted this round, return
      console.log("Move sequence initiated/continued, complete the sequence to make a move.");
      return;
    }
    // if a move was attempted, whether or not it is accepted, we need to clear the lastKnownValidBoard
    // this will reset the moveSequenceAr by extension.
    lastKnownValidBoard = null;
    
    if(!attemptedMove) {
      // a move attempted and it failed
      console.log("Invalid move attempted.");
      compareMockToGame("The move which you have requested is invalid.");
      
    } else {
      // move attempted and accepted locally - emit the move request to the server (may still be rejected by the server)
      console.log("Valid move sequnce.");
      Socket.emit("moveRequest", { move: attemptedMove });
      $scope.$apply(function() {
        $scope.switchTurns();
      });
    }
  }
  
  // ALERT MODAL FUNCTIONS
  $scope.openModal = function() {
    
    // sometimes the socket goes off before the page is finished initializing. If so wait until modal is created.
    if(!$scope.modal) {
      setTimeout(function(){
        $scope.openModal()
      }, 10);
    }
    $scope.modal.show();

    // on open modal create the real gameboard to display what the current position of the game board is.
    var cfg = {
      draggable: false,
      pieceTheme: 'lib/chessboard.js/dist/img/chesspieces/wikipedia/{piece}.png',
    };
    var gameboard = ChessBoard('gameboard', cfg);
    gameboard.position($scope.activeChessGame.fen());
    
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
  
  // INFO MODAL FUNCTIONS
  $scope.openInfoModal = function() {
    
    // sometimes the socket goes off before the page is finished initializing. If so wait until modal is created.
    if(!$scope.infoModal) {
      setTimeout(function(){
        $scope.openModal()
      }, 10);
    }
    
    $scope.infoModal.show();
  };
  $scope.closeInfoModal = function() {
    // THIS NEEDS TO BE UPDATED IF WE EVER CLOSE THE MODAL FROM ANYWHERE BUT FROM THE MODAL ITSELF
    // this says that immediately when the info modal is closed that we should verify board position.
    $scope.infoModal.hide();
    // here is where we can place our start of the game logic.
    compareMockToGame("Your initialized board does not match the expected board position.");
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
    
    $scope.closeInfoModal();
    // $scope.restartGame();
  }
  $scope.$on('$destroy', function() {
    $scope.infoModal.remove();
  });
})
;

function isPowerOfTwo(num) {
  return (num & (num - 1)) == 0;
}

/**
 * Gets the bitwise representation of a boardBitmap (as a string or 0s and 1s) of a number.
 */
function bitRep(number) {
   if(typeof number !== 'number') {
    console.log("Oops, you did not send in a number.");
    return;
  }
  
  var bitREp = "";
  // number is an 8 bit number represenation.
  // So just in case we set number equal to the 8 bit cap (all ones)
  number = number & 255;
  for(var i=7; i >= 0; i--) {
    // if this was 
    bitREp += ((number & (1 << i)) > 0) ? '1' : '0';
  }
  return bitREp;
}


/**
 * Takes in a start and ending bitmap and determines which move has been made on the board.
 * NOTE: This only validates that a vaild number of pieces have been moved that coudl correspond to a move,
 *  it does not check whether the move itself was valid.
 * NOTE: If an invalid number of pieces are moved, [] will be returned and the user should be asked to reset the board
 *  to the last known position.
 * 
 * Valid move options.
 *  Pick up,
 *  Swap,
 *  A to B
 */
function getMove(start, end) {
  var changeCounter = 0;
  var diff;
  var startMove = [];
  var endMove = [];

  console.log(start);
  console.log(end);

  /**
   * Loop through each row in the board bitmap arrays and xor them to learn which positions have been changed
   * (new presence of a piece, or piece has been removed.) 
   */  
  for(var i=0; i < start.length; i++){
    diff = start[i] ^ end[i];

    // if a diff exists in the current row exists and the piece existed in the start board then it is the starting
    // location of the move, else it is the ending location of the move.
    if((start[i] & diff) > 0) {
      startMove.push(start[i] & diff);
      changeCounter++;
    } else {
      startMove.push(0);
    }
    if((end[i] & diff) > 0) {
      endMove.push(end[i] & diff);
      changeCounter++;
    } else {
      endMove.push(0);
    }
  }

  // validate that the number of moves was valid: Can either remove a piece, swap a piece, or move to new place on
  // board that did not formerly have a piece on it (1 or 2 changes).
  if(changeCounter < 1 || changeCounter > 2) {
    console.log("An invalid number of pieces of been changed since the last update.");
    return [];
  }

  // handle the return of the move as a move array
  var startMoveLocation = getActivatedSpace(startMove);
  var endMoveLocation = getActivatedSpace(endMove);

  /**
   * End Move location is null when the piece is removed, startMoveLocation when the piece is dropped, we can easily encode this informaiton
   * 
   * Add a line on the front end UI that says if you made a swap please pick up the piece and drop it again.
   *  Only if the piece didnt change though, unless we want to trigger a move action on something like a on drag??
   */
  
  if(startMoveLocation && endMoveLocation) {
    // if both start and end are sepcified then return a full move array.
    return [{
        location: startMoveLocation,
        action: "up"
      }, {
        location: endMoveLocation,
        action: "down"
      }];
  } else if (startMoveLocation) {
    // if only the startMoveLocation is specified then the piece was just placed down.
    return [{
        location: startMoveLocation,
        action: "down"
    }];
  } else if(endMoveLocation) {
    // if only the endMoveLocation is specified then the piece was just picked up.
    return [{
        location: endMoveLocation,
        action: "up"
    }];
  }
  console.log("Oops, getMove is returning that no move has occurred...");
  return [];
}

/**
 * Returns the first activated space that the alg can find. On no space found returns null.
 */
function getActivatedSpace(boardAr) {
  var changeAr = [];
  for(var i=0; i < boardAr.length; i++) {
    
    for(var x=0; x < boardAr.length; x++) {
      if((boardAr[i] & (1 << x)) > 0) {
        switch(boardAr[i] & (1 << x)) {
          case 128:
            changeAr.push('a' + (i+1));
            break;
          case 64:
            changeAr.push('b' + (i+1));
            break;
          case 32:
            changeAr.push('c' + (i+1));
            break;
          case 16:
            changeAr.push('d' + (i+1));
            break;
          case 8:
            changeAr.push('e' + (i+1));
            break;
          case 4:
            changeAr.push('f' + (i+1));
            break;
          case 2:
            changeAr.push('g' + (i+1));
            break;
          case 1:
            changeAr.push('h' + (i+1));
            break;
        }
      }
      
      // NOTE: used to be used to detect an array of change, we are just hanging the code here
      // to only observe a single change in case we want to revert the code later.
      if(changeAr.length > 0) {
        return changeAr[0];
      }
    }
  }
  return null; // changeAr;
}

/**
 * What we need to do here is toggle the bits in the bitmap based upon the moves.
 * Each move has a .to and .from property.
 * 
 * NOTE: We do not perform move validation here, meaning 
 */
function updateBitmapFromMove(boardBitmap, move) {
  var from = locationToColRowRep(move.from);
  var to = locationToColRowRep(move.to);
  // col A is MSB so we need to swizzle the bits and 0 index.
  var fromColShift = (8 - from.col);
  var toColShift = (8 - to.col);
  // Verify that the starting location had a piece on it before.
  if((boardBitmap[from.row - 1] & (1 << fromColShift)) == 0) {
    console.log("Oops, the former boardbitmap did not have a piece situated on the from of the move.");
    return null;
  }
  // turn off the bit in the from 
  boardBitmap[from.row - 1] = (255 ^ (1 << fromColShift)) & boardBitmap[from.row - 1];
  // turn on the bit in the to
  boardBitmap[to.row - 1] = (1 << toColShift) | boardBitmap[to.row - 1];
  return boardBitmap;
}

/**
 * Takes in a board location of form: A6 (letter-number) and converts it into
 * a location object with 1-index row and col property. 
 */
function locationToColRowRep(loc) {
  var col;
  switch(loc.charAt(0)) {
    case 'a':
      col = 1;
      break;
    case 'b':
      col = 2;
      break;
    case 'c':
      col = 3;
      break;
    case 'd':
      col = 4;
      break;
    case 'e':
      col = 5;
      break;
    case 'f':
      col = 6;
      break;
    case 'g':
      col = 7;
      break;
    case 'a':
      col = 8;
      break;
  }
  return {
    col: col,
    row: parseInt(loc.charAt(1))
  };
}
        
/**
 * Prints a bitwise representation of a board bitmap array
 */
function printBoard(boardAr) {
  if(!(boardAr instanceof Array) || boardAr.length != 8) {
    console.log("Oops, your board is not an array of numbers that is 8 elements long.");
    return;
  }
  
  // we store logically with 0 being the bottom element, but in chess the white perpective has 8 in the top
  // left and 0 in the bottom left. So write to console backwards.
  for(var i=7; i >= 0; i--) {
    console.log(bitRep(boardAr[i]));
  }
}