/**
 * Global board object which is the middle man between socket.io and the boards rest reqest service.
 * This should contain
 */
export var board = {
  bitmap: [],
  move: {
    action: null, // "00-00"
    state: null // complete / inProgress <- moveState
  }
};

/**
 * Possible states that a move can be in, either in progress or completed.
 */
var moveState = {
  complete: "complete",
  inProgress: "inProgress"
}

/**
 * Simply requests a new move by changing the current active move
 */
export function requestMove(moveString) {
  // validate move
  var moveAr = moveString.split('-');
  if(moveAr.length != 2) {
    // check for two blocks on either side of the dash
    return "Error-InvalidMoveStringRequested (1)";
  } else if(moveAr[0].length != 2 || moveAr[1].length != 2) {
    // check that each of the moves are composed of 2 numbers
    return "Error-InvalidMoveStringRequested (2)";
  }
  console.log(moveAr);
  // validate all are numbers and that they are between 1 and 8
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
 * Attempts to mark the current requested move as finished.
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
 * Returns whether the current move request has completed yet.
 * 
 * Note: If no move has ever been requested then this will return true
 * Else returns the state of the current move.
 * Note: Returns false on no moveState set.
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
  board.bitmap = bitmap;
  return "success";
}

/**
 * returns the current bitmap as a dash ('-') seperated string
 */
export function getBoardBitMapString() {
  return board.bitmap.join('-');
}

export function getGameState() {
  
}