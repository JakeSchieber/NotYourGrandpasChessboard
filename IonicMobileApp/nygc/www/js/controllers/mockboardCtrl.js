angular.module('nygc.controllers')

/**
 * TODO: You can move pieces when its not your turn without reprecussion.
 */

.controller('MockBoardCtrl', function($scope, Socket, $ionicModal, $cordovaDialogs) {
  /**
   * Scoped game variables
   */
  var board, boardFen, boardBitmap;
  $scope.colors = ['w', 'b'];
  $scope.fullColors = ['white', 'black'];
  $scope.me = $scope.colors[1];
  
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
   * Handles the scoped moveslist.
   */
  $scope.moveList = []; // a list to display all of the moves made in the current game.
  function initMovesList(chessJsMoveAr) {
    for(var i=0; i<chessJsMoveAr.length; i++) {
      appendToMoveList(chessJsMoveAr[i]);
    }
  }
  /**
   * Takes in a move formatted to chess.js standards.
   * Move from api:  {from: "d7", to: "d5"}
   * Move format in list: 
   *   {
   *     title: "A2 -> E3 (Pawn attack Queen)",
   *     me: true
   *   }
   *  
   */
  $scope.turnFlag = true; // used to alternate the role of the move placement.
  function appendToMoveList(move) {
    $scope.moveList.push({
      title: move.from + " -> " + move.to,
      me: $scope.turnFlag 
    });
    $scope.turnFlag = !$scope.turnFlag;
  }
  function clearMovesList() {
    $scope.moveList = [];
  }
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
    clearMovesList();
    $scope.activeChessGame = new Chess(); // new chess game
    $scope.resetTurns();
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
   * this method is going to allow for us to force the sensing of a locaiton on the board and thus
   * be able to test our moving logic without an active board connection.
   */
  $scope.forceLocationSense = function() {
    $cordovaDialogs.prompt("Enter the piece location with format following: 'a1'", "Manual Entry", ['Submit', 'Cancel'], "")
      .then(function(result) {
        // accept A1 for a1
        result.input1 = result.input1.toLowerCase();
        if(result.buttonIndex == 1 && isValidLetterLocName(result.input1)) {
          // success callback
          console.log("move validated: " + result.input1);
          processActionPoll(result.input1);
        } else if(result.buttonIndex == 1){
          // error callback
            $cordovaDialogs.alert('Your location could not be parsed. Try your move again.', 'Oops', 'OK')
            .then(function() {
              // callback success
            });
        } else {
          // conole.log("Huh Uh clicked");
        }
      });
  }
  
  /**
   * Handles the input from the socket and allows the user to enter the move automatically if necessary.
   * Else allows the user to try again until the move works.
   */
  function validatePolledMove(numberLoc) {
    var letterLoc = numberLocToLetterLoc(numberLoc);
    $cordovaDialogs.confirm('Location Sensed, is this correct?', letterLoc, ['Accept', 'Enter Manually', 'Try Again'])
      .then(function(buttonIndex) {
        // no button = 0, 'OK' = 1, 'Cancel' = 2
        console.log(buttonIndex);
        if(buttonIndex == 1) {
          // success callback
          console.log("move validated: " + letterLoc);
          processActionPoll(letterLoc);
        } else if(buttonIndex == 2) {
          $scope.forceLocationSense();
        } else {
          // conole.log("Nope clicked");
        }
      });
  }
  
  /**
   * On controller load subscribe to the mockboard poll.
   */
  Socket.emit("subscribeToMockboardPoll", { });
  
  // THIS IS WHAT WE NEED TO CHANGE!!! WE NEED TO POLL NOT FROM THE MOCKBOARD,
  // BUT INSTEAD FROM BLUETOOTH
  
  Socket.on("bluetoothActionPoll", function(data) {
    console.log("bluetoothActionPoll received!");
    console.log(data);
    validatePolledMove(data.loc);
  });
  
  /**
   * Mockboard poll handler function
   */
  // warning this is not going to stop the requiring of them to match...
  var disableMockboardMoveAbility = true;
  Socket.on("mockboardPoll", function(data) {
    if(!disableMockboardMoveAbility) { // would love to turn this back on.
      if(boardFen != data.boardFen) {
        console.log("A change from mockboard has occurred");
        handleBoardUpdate(data, false, true && !disableMockboardMoveAbility);
        
        // need to call compare so that we can trigger the close action on resolved.
        if($scope.compareBoardFlag) {
          // no message needed since this will only cause the close modal action.
          compareMockToGame();
        }
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
      // init the list of moves to the user.
      initMovesList(data.history);
      
      $scope.gameboardInitted = true;
      
      console.log("the turn is: " + data.turn);
      
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
        clearMovesList();
        $scope.activeChessGame = new Chess(); // new chess game
        $scope.resetTurns();
        // Note: We should add a flag here so that we can make a unique message in the alert window.
        compareMockToGame("Opponent requested to reset the game.");
        return;
      }
    
      // assume that whenever we receive a board update from the server that a move was made by the opponent
      // and that it is now our turn.
      
      // update the chess.js logic for the game. (Could add moves, but this is easier.)
      $scope.activeChessGame = new Chess(data.boardFen);
      
      // NOTE: Need to update the board before you check the logic, else the opponent wont know why he won/loss
      // issue request to update the mockboard on the website.
      Socket.emit("forceUpdateMockboard", data);
      
      if(isGameOver(false)) {
        // if game is over then we are done.
        return;
      }
      
      // switch the labels specifing whose turn it is.
      $scope.switchTurns();
      appendToMoveList(data.move);
      // update the board on the screen.
      // NOTE: isReset flag sent inside of data now.
      console.log(data);
      handleBoardUpdate(data, false, false);
      
      // ISSUE MOVE UPDATE TO THE BOARD...
      
      // NOTE: In real life, we need to now wait here until the motor is finished moving before
      // we can start issuing future move requests.
      
      
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
    $scope.moveSequenceAr = [];
  }
  
  /**
   * Manages the moveSequenceAr based upon polls from the board.
   * Then processes a board update based upon an inferred move combintation
   */
  function processActionPoll(letterLoc) {
    // if the first move in a sequence it cant be a down action, must pick a location that has a piece on it.
    if(!$scope.activeChessGame.get(letterLoc) && (!$scope.moveSequenceAr || $scope.moveSequenceAr.length == 0)) {
      console.log(letterLoc);
      $cordovaDialogs.alert('The location that you specified is not recorded as having a piece on it...', 'Error', 'OK')
        .then(function() {
          // callback success
        });
      return;
    }
    var locs = $scope.moveSequenceAr.map(function(a) {
      return a.location;
    });
    var move;
    // if that space has already been involved in the sequence then the logic flips (pick up and a place)
    if(locs.indexOf(letterLoc) >= 0) {
      if(!$scope.activeChessGame.get(letterLoc)) {
// WARNING: This is not currently supported yet
        // if already in the list, but not on the original board, then the user placed and picked it back up.
        move = [{
          location: letterLoc,
          action: "up"
        }];
      } else {
        // already in the list, and started with a piece on it, this must be a down after a pickup at that location.
        move = [{
          location: letterLoc,
          action: "down"
        }];
      }
    } else {
      if(!$scope.activeChessGame.get(letterLoc)) {
        // not in list and no piece there before, this is a down action
        move = [{
          location: letterLoc,
          action: "down"
        }];
      } else {
        // not in list and a piece was there before, this is an up action
        move = [{
          location: letterLoc,
          action: "up"
        }];
      }
    }
 // WARNING: We should have this force an update to the mockboard as well if a move is processed, that way the web panel
 // is synchronous with the board.
    console.log("attempting this shit");
    // move inferred above
    // boardFen is a global
    // true as 3rd argument tells the function to update the boardbitmap global if a move is made.
    handleMove(move, boardFen, true, true);
    console.log({
      boardFen: $scope.activeChessGame.fen(),
      boardBitmap: boardBitmap // is up to date at this time.
    });
    Socket.emit("forceUpdateMockboard", {
      boardFen: $scope.activeChessGame.fen(),
      boardBitmap: boardBitmap
    });
    console.log($scope.moveSequenceAr);
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
        // console.log(boardBitmap);
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
        console.log(gameUpdate);
        console.log(boardBitmap);
        console.log(move);
        boardBitmap = updateBitmapFromMove(boardBitmap, gameUpdate.move);
      }
    } else {      
      console.log("we are initting...");
      console.log(gameUpdate);
      boardFen = gameUpdate.boardFen;
      boardBitmap = gameUpdate.boardBitmap;
      // warning this is nulll!
      console.log(boardBitmap);
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
  function handleMove(move, origBoardFen, updateBitmapAfterMove, bluetoothActionHack) {        
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
      $scope.moveSequenceAr = []; // this is redundant we shifted this down to after moves being made.
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
    
    /*
      Allow for multiple move sequences where pieces can be removed and create display the past move list to the user on the UI.
      
      NOTE: We should change the reset the game logic toa function which takes care of reset things like the move list. 
    */
    console.log($scope.moveSequenceAr.length);
    console.log(move.length);
    var attemptedMove, moveAttempted;
    if($scope.moveSequenceAr.length == 0 && move.length == 2) {
      // No move sequence started, but complete move has been made
      // this represents the situation where a piece is simply advanced on the board (no attack)
      attemptedMove = $scope.activeChessGame.move({ from: move[0].location, to: move[1].location });
      moveAttempted = true;
    } else if ($scope.moveSequenceAr.length == 0 && move.length == 1) {
      // for some reason bluetooth polls are getting digest errors, dont have time to debug.
      if(!bluetoothActionHack) {
        // if we have not started a move sequence and if this is only one move in a sequence log the move and wait for the next
        $scope.$apply(function() {
          // POSSIBLE BUG: IF THE USER DROPS A PIECE DIRECTLY ON THE PIECE THAT THEY ARE TAKING THEN THIS CODE WILL BREAK 
          
          // just a piece picked up.
          // NOTE: This is too hard to test against since the user may pick up first the piece which they are going to attack.
          $scope.moveSequenceAr.push(move[0].location);
        });
      } else {
        $scope.moveSequenceAr.push(move[0].location);
      }
    } else if($scope.moveSequenceAr.length == 1 && move.length == 2) {
      /**
       * If we have already started a move sequence and if a complete move has been made.
       * 
       * USE CASE 1: User picks up the piece that they want to take, then move the attacking piece
       * to that same "taken" location
       */
      $scope.$apply(function() {
        // special complete a move.
        $scope.moveSequenceAr.push(move[0].location);
        
        // USE CASE 1
        if($scope.moveSequenceAr[0] == move[1].location) {
          // user picked up the piece that they wanted to take then performed the attack action
          attemptedMove = $scope.activeChessGame.move({ from: move[0].location, to: move[1].location });
        } else {
          console.log("USE CASE 1 FAIL:");
          // no set on attempted move will cause this to trigger a reset.
        }
        moveAttempted = true;
      });
      // this will complete a move.
    } else if($scope.moveSequenceAr.length == 1 && move.length == 1) {
      /**
       * If we have already started a move sequence and if a half move has been made.
       * 
       * USE CASE: User picks up the piece that they want to take and then picks up their own piece.
       * USE CASE: User picks up the piece that they want to move, then sets it down.
       */
      // for some reason bluetooth polls are getting digest errors, dont have time to debug.
      if(!bluetoothActionHack) {
        $scope.$apply(function() {
          if(move[0].action == "down" && move[0].location == $scope.moveSequenceAr[0]) {
            // Returned a piece that the user just picked up.
            console.log("piece returned.");
            $scope.moveSequenceAr = [];
            //return;
          } else if(move[0].action == "down") {
            // The user returned their piece to the board but at a new location. Completed a move
            console.log("move sequence finished");
            attemptedMove = $scope.activeChessGame.move({ from: $scope.moveSequenceAr[0], to: move[0].location });
            moveAttempted = true;
            //return;
          } else {
            // else another piece was picked up, continue the sequence
            $scope.moveSequenceAr.push(move[0].location);
          }
        });
      } else {
        if(move[0].action == "down" && move[0].location == $scope.moveSequenceAr[0]) {
          // Returned a piece that the user just picked up.
          console.log("piece returned.");
          $scope.moveSequenceAr = [];
        } else if(move[0].action == "down") {
          // The user returned their piece to the board but at a new location. Completed a move
          console.log("move sequence finished");
          attemptedMove = $scope.activeChessGame.move({ from: $scope.moveSequenceAr[0], to: move[0].location });
          moveAttempted = true;
        } else {
          // else another piece was picked up, continue the sequence
          $scope.moveSequenceAr.push(move[0].location);
        }
      }
      // this will complete a move.
    } else if($scope.moveSequenceAr.length == 2 && move.length == 1) {
      /**
       * If we have 2 moves in the current sequence and the user places a piece down
       * 
       * USE CASE: User picks up their piece and the piece that they want to take, then places their
       * own piece onto the piece of the boad which they are "taking"
       */
      // for some reason bluetooth polls are getting digest errors, dont have time to debug.
      if(!bluetoothActionHack) {
        $scope.$apply(function() {
          var inferredMove = getValidMove($scope.moveSequenceAr[0], $scope.moveSequenceAr[1]);
          console.log(inferredMove);
          attemptedMove = $scope.activeChessGame.move({ from: inferredMove.move.from, to: inferredMove.move.to });
          moveAttempted = true;
          
          // Note: you will get repeater error if you push to sequence again.
          // $scope.moveSequenceAr.push(move[0].location);
        });
      } else {
        var inferredMove = getValidMove($scope.moveSequenceAr[0], $scope.moveSequenceAr[1]);
        console.log(inferredMove);
        attemptedMove = $scope.activeChessGame.move({ from: inferredMove.move.from, to: inferredMove.move.to });
        moveAttempted = true;
      }
      // this will complete a move.
    } else {
 // HMMM Does this work on the app? I dont think that it does.
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
    $scope.moveSequenceAr = [];
    
    if(!attemptedMove) {
      // a move attempted and it failed
      console.log("Invalid move attempted.");
      compareMockToGame("The move which you have requested is invalid.");
      
    } else {
      console.log(attemptedMove);
      
      // move attempted and accepted locally - emit the move request to the server (may still be rejected by the server)
      console.log("Valid move sequnce.");
      Socket.emit("moveRequest", { move: attemptedMove });
      
      // NOTE: this wont work when we start doing complex moves: We need to submit the whole movie.
      appendToMoveList({ from: attemptedMove.from, to: attemptedMove.to });
      
      if(updateBitmapAfterMove) {
        console.log("attempting to updated the board bitmap.");
        boardBitmap = updateBitmapFromMove(boardBitmap, attemptedMove);
      }
      
      // hacky shit
      if(!bluetoothActionHack) {
        $scope.$apply(function() {
          $scope.switchTurns();
          if(isGameOver(true)) {
            // if game is over then we are done.
            return;
          }
        });
      } else {
        $scope.switchTurns();
        if(isGameOver(true)) {
          // if game is over then we are done.
          return;
        }
      }
    }
  }
  
  /**
   * Checks if the game is over or not, if it is then it sets the required scoped variables appropriately.
   * If it is then the game over modal appears.
   * returns whether the game over modal is shown
   * 
   * NOTE: Relies on the scoped active chess board.
   */
  function isGameOver(checkIsFromPlayer) {
    if($scope.activeChessGame.game_over()) {
      $scope.gameOver = true;
      $scope.win = checkIsFromPlayer;
      // this logic isnt working, we are just going to see who is calling the check now.
      // $scope.win = !(($scope.placing == $scope.me) && $scope.activeChessGame.in_checkmate());
      $scope.openInfoModal();
      return true;
    }
    return false;
  }
  
  /**
   * This is a function used to take 2 move LOCATIONS, in no specific order, and determine if a valid 
   * move combination exists between them.
   * NOTE: Uses the current scoped lastKnownValidBoard
   * 
   * RETURNS: {
   *  valid: boolean denoting whether a valid move exists (when false compareMockToGame triggered.)
   *  move: an object containing the from to move combination
   * }
   * 
   * NOTE: even if a valid move exists, this funciton does not handle the making of the move itself.
   */
  function getValidMove(loc1, loc2) {
    var moves1 = $scope.activeChessGame.moves({square: loc1, verbose: true});
    var moves2 = $scope.activeChessGame.moves({square: loc2, verbose: true});
    
    // LOL this is shit logic but I really dont care anymore...
    var move1hit, move2hit;
    for(var i = 0; i < moves1.length; i++) {
      // also need to check that placing is the same as color:
      if((moves1[i].to == loc2) && ($scope.placing == moves1[i].color)) {
        move1hit = true;
        break;
      }
    }
    for(var i = 0; i < moves2.length; i++) {
      if((moves2[i].to == loc1) && ($scope.placing == moves2[i].color)) {
        move2hit = true;
        break;
      }
    }
    if (move1hit) {
      //console.log("valid move A from:");
      //console.log(moves1);
      //console.log(loc2);
      return {
        valid: true,
        move: {
          to: loc2,
          from: loc1
        }
      };
    }
    
    else if(move2hit) {
      //console.log("valid move B from:");
      //console.log(moves2);
      //console.log(loc1);
      return {
        valid: true,
        move: {
          to: loc1,
          from: loc2
        }
      };
    }
    
    else {
      // The two spaces have no valid move combinations.... Invalid sequence.
      compareMockToGame("Invalid sequence detected, there are no available moves involving spaces: %s and %s.", loc1, loc2);
      
      return {
        valid: false,
        move: {}
      };
    }
    
  }
  
  // ALERT MODAL FUNCTIONS
  $scope.openModal = function() {
    // sometimes the socket goes off before the page is finished initializing. If so wait until modal is created.
    if(!$scope.modal) {
      setTimeout(function(){
        $scope.openModal()
      }, 10);
      return;
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
    $scope.gameOver = false;
    $scope.win = false;
        
    $scope.closeInfoModal();
    $scope.restartGame();
  }
  $scope.$on('$destroy', function() {
    $scope.infoModal.remove();
  });
});

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
        action: "up"
    }];
  } else if(endMoveLocation) {
    // if only the endMoveLocation is specified then the piece was just picked up.
    return [{
        location: endMoveLocation,
        action: "down"
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
  console.log("starting.");
  console.log(boardBitmap);
  console.log(move);
  
  var from = locationToColRowRep(move.from);
  var to = locationToColRowRep(move.to);
  console.log(from);
  console.log(to);
  
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
    case 'h':
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

/**
 * Takes in a 1-based number number location combination and creates a letter based location
 * 
 * NOTE: This should have an option for 0-index as well, but the api is using 1-based atm
 */
function numberLocToLetterLoc(loc) {
  if(loc.length != 2) {
    return "xx";
  }
  var col;
  switch(loc.charAt(0)) { // input is a 2 character string containing numbers
    case '1':
      col = 'a';
      break;
    case '2':
      col = 'b';
      break;
    case '3':
      col = 'c';
      break;
    case '4':
      col = 'd';
      break;
    case '5':
      col = 'e';
      break;
    case '6':
      col = 'f';
      break;
    case '7':
      col = 'g';
      break;
    case '8':
      col = 'h';
  }
  return col + loc.charAt(1);
}

/**
 * validates whether a loc is a valid letter location name
 * WARNING: accepts only a lower case letter as the letter part of the location
 */
function isValidLetterLocName(loc) {
  if(loc.length != 2) {
    return false;
  }
  if(loc.charAt(0) < 'a' || loc.charAt(0) > 'h') {
    return false;
  }
  var row = parseInt(loc.charAt(1));
  if(row < 1 || row > 8) {
    return false;
  }
  return true;
}