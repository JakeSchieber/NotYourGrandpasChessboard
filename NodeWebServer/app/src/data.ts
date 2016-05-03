/**
 * TODO:
 * All of these functions work but we have  not yet handled any of the game progression logic
 * which changes the values stored in the board global variable.
 */

/**
 * The possible game states are written below.
 * Special state waitingForFirstMove represents the state which is fallen into
 * after a board reset request.
 */
var gameState = {
  uninitialized: "uninitialized", // game has not officially been started by the app
  over: "over",
  whiteMove: "whiteMove",
  blackMove: "blackMove",
  waitingForFirstMove: "waitingForFirstMove"
}

/**
 * Global board object which is the middle man between socket.io and the boards rest reqest service.
 * This should contain
 */
export var board = {
  bitmap: [],
  previousBoards: [], // An array of 10 boards.
  numPrevBoardsToKeep: 8,
  move: {
    action: null, // "00-00"
    state: null // complete / inProgress <- moveState
  },
  reset: false, // goes high when the board triggers a reset to the server.
  gameState: gameState.uninitialized,
  postMockBoardMoves: false, // if true then both game and mockboard moves posted to handleMove
  state: null,
  counter: null
};

/**
 * Board States
 */
export var states = {
  waiting: "waiting",
  picking: "picking",
  placing: "placing",
  waitingToPick: "waitingToPick",
  waitingToPlace: "waitingToPlace"
}
export function setState(newState) {
  board.state = newState;
}

/**
 * Possible states that a move can be in, either in progress or completed.
 */
var moveState = {
  complete: "complete",
  inProgress: "inProgress",
  ready: "ready"
}

/**
 * Simply requests a new move by changing the current active move
 */
export function requestMove(moveString) {
  // NOTE: This needs to progress the game state...
  
  // We allow 00-00 to be requested by the board to get into a reset state:
  if("00-00-00") {
    board.move.action = moveString;
    board.move.state = moveState.ready;
    return "success-reset";
  }
  
  // validate move
  var moveAr = moveString.split('-');
  if(moveAr.length != 3) {
    // check for two blocks on either side of the dash
    return "Error-InvalidMoveStringRequested (1)";
  } else if(moveAr[0].length != 2 || moveAr[1].length != 2 || moveAr[1].length != 3) {
    // check that each of the moves are composed of 2 numbers
    return "Error-InvalidMoveStringRequested (2)";
  }
  // validate all are numbers and that they are between 1 and 8
  // Note, we are not validating the capture and color flags
  var mov1a = parseInt(moveAr[0].substring(0, 1));
  var mov1b = parseInt(moveAr[0].substring(1, 2));
  var mov2a = parseInt(moveAr[1].substring(0, 1));
  var mov2b = parseInt(moveAr[1].substring(1, 2));
  if(isNaN(mov1a) || isNaN(mov1b) || isNaN(mov2a) || isNaN(mov2b)) {
    return "Error-InvalidMoveStringRequested (3)";
  } else if(mov1a < 1 || mov1a > 8 || mov1b < 1 || mov1b > 8 || mov2a < 1 || mov2a > 8 || mov2b < 1 || mov2b > 8) {
    return "Error-InvalidMoveStringRequested (4)";
  }
  // else we are all good! We assume game logic accepts the move
  board.move.action = moveString;
  board.move.state = moveState.inProgress;
  return "success";
}
/**
 * triggered when the board is reset so that the physical board starts to poll 00-00
 */
export function resetMove() {
  board.move.action = "00-00-00";
  board.move.state = moveState.ready;
}

/**
 * Allows the board to signal when a move has been finished (because the board has to move the motors)
 * 
 * moveString: move which we are trying to complete
 * Return: String representing response
 */
export function finishMove(moveString) {
  if(moveString == board.move.action) {
    if(board.move.state == moveState.complete) {
      return "MoveAlreadyCompleted"
    }
    return "success";
  }
  return "Error-MoveIsNotTheCurrentMove";
}

/**
 * Returns whether the current move request is in a completed state.
 * NOTE: this requires that you know locally what the current move is.
 * 
 * Note: If no move has ever been requested then this will return true
 * Else returns the state of the current move.
 * 
 * USAGE: I think the best usage for this function is to be used by game logic to determine 
 * whether or not it can proceed with the front ends next decision
 */
export function moveFinished() {
  if(!board.move.action) {
    return true;
  }
  return board.move.state == moveState.complete;
}

/**
 * Takes in a boardBitMapString (series of 8 numbers spaced with '-')
 * And sets the boardBitmapArray
 * 
 * return: User facing string
 */
export function setBoardBitmap(boardBitMapString) {
  var bitmap = boardBitMapString.split('-').map(a => {
    // split by dash and parse all contents into a number
    return parseInt(a);
  }).filter(a => {
    // not a number returned when parseInt is sent invalid data
    return !isNaN(a) && a >= 0 && a <= 255;
  });
  // as long as 8 numbers are in array we assume that the number is good!
  if(bitmap.length != 8) {
    return "Error-StringMustBeADashSeparatedListOf8Numbers"
  }
  
  // every time that we update the boardbitmap we also update the previous board logic.
  if(!board.numPrevBoardsToKeep || board.numPrevBoardsToKeep > board.previousBoards.length) {
    board.previousBoards.push(board.bitmap);
  } else {
    board.previousBoards.splice(0, 1);
    board.previousBoards.push(board.bitmap);
  }
  board.bitmap = bitmap;

  // console.log(board.bitmap);
  return "success";
}

/**
 * returns the current bitmap as a dash ('-') seperated string
 */
export function getBoardBitMapString() {
  return board.bitmap.join('-');
}

/**
 * Return a list of which pieces on the board are never deactivating.
 * 
 * True when the board is settled, but a piece on the board is active.
 */
export function piecesThatAreBorked() {
  // for() {}
}

/**
 * returns whehter the current board bitmap is settled constant for the last numPrevBoardsToKeep polls
 * 
 * NOTE: This logic is shit and can easily be updated to save many cycles.
 */
var lastSnap;
var constCount;
export function boardIsSettled() {
  // cant returned settled board until we have at least the required amount of samples.
  if(board.numPrevBoardsToKeep > board.previousBoards.length) {
    return false;
  }
  
  var boardSettled = true;
  var rowSettled;
  // compare all boards against zero.
  for(var i = 1; i < board.previousBoards.length; i++) {
    rowSettled = true;
    // compare each row on the board
    for(var x = 0; x < board.previousBoards[i].length; x++) {
      // if not equal then not settled.
      if(board.previousBoards[0][x] != board.previousBoards[i][x]) {
        rowSettled = false;
      }
    }
    // boardSettled if true up until this point and if true for that baord.
    boardSettled = boardSettled && rowSettled;
  }
  return boardSettled;
}

/**
 * Returns true only when all zeros is achieved on the board map.
 */
export function boardIsSuperSettled() {
  // cant returned settled board until we have at least the required amount of samples.
  if(board.numPrevBoardsToKeep > board.previousBoards.length) {
    return false;
  }
  var boardSettled = true;
  for(var i = 1; i < board.previousBoards.length; i++) {
    // compare each row on the board
    for(var x = 0; x < board.previousBoards[i].length; x++) {
      // if not equal then not settled.
      if(board.previousBoards[i][x]) {
        boardSettled = false;
      }
    }
  }
  return boardSettled;
}

/**
 * Set high by the game board, set low when handled by the game server.
 */
export function setReset(high: boolean) {
  board.reset = high;
  return "success";
}

export function getGameState() {
  return board.gameState;
}

export function setPostMockBoardMoves(bool: boolean) {
  board.postMockBoardMoves = bool;
}

/**
 * Takes in a board location of form: A6 (letter-number) and converts it into
 * a location object with 1-index row and col property. 
 */
export function locationToColRowRep(loc) {
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
 * where move is an object with a to and from object
 * 
 * NOTE: SAM LOGIC BACKWARDS
 */
export function moveToMoveString(move) {
  var start = locationToColRowRep(move.from);
  var end = locationToColRowRep(move.to);
  var captured = (move.captured) ? '1' : '0';
  // if white made the move then the piece that was taken was black
  var color = (move.color == 'w') ? '1' : '0';
  
  console.log(start.row + '' + start.col + "-" + end.row + '' + end.col + '-' + captured + color);
  
  // return start.col + '' + start.row + "-" + end.col + '' + end.row;
  return start.row + '' + start.col + "-" + end.row + '' + end.col + '-' + captured + color;
  // SAM HACK
}


/**
 * This is stupid
 */
export function resetCounter() {
  board.counter = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ];
}
export function incrementCounter() {
  for(var i = 0; i < board.bitmap.length; i++) {
    for(var x = 0; x < 8; x++) {
      if((board.bitmap[i] >> x) & 1) {
        // need to do 7 - x to invert the msb into position 0.
        board.counter[i][7 - x]++;
      }
    }
  }
}
/**
 * Returns the most polled space in the counter.
 */
export function getCounterMax() {
  console.log(board.counter);
  var maxRow = 0, maxCol = 0, maxVal = 0;
  for(var i = 0; i < 8; i++) {
    for(var x = 0; x < 8; x++) {
      console.log("is max less than current: " + maxVal + " and " + board.counter[i][x] + " " + i + " " + x);
      if(board.counter[maxRow][maxCol] < board.counter[i][x]) {
        console.log("i and x: " + i + " and " + x);
        maxRow = i;
        maxCol = x;
        maxVal = board.counter[i][x];
      }
    }
  }
  console.log(board.counter);
  return (maxCol+1) + '' + (8 - maxRow); // had to flip row logic... no idea why its wrong....
}