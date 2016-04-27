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
  if(moveString.length != 5) {
    return "Error-InvalidMoveStringRequested";
  }
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