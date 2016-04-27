exports.board = {
    bitmap: [],
    move: {
        action: null,
        state: null
    }
};
var moveState = {
    complete: "complete",
    inProgress: "inProgress"
};
function requestMove(moveString) {
    if (moveString.length != 5) {
        return "Error-InvalidMoveStringRequested";
    }
    exports.board.move.action = moveString;
    exports.board.move.state = moveState.inProgress;
    return "success";
}
exports.requestMove = requestMove;
function finishMove(moveString) {
    if (moveString == exports.board.move.action) {
        if (exports.board.move.state == moveState.complete) {
            return "MoveAlreadyCompleted";
        }
        return "success";
    }
    return "Error-MoveIsNotTheCurrentMove";
}
exports.finishMove = finishMove;
function moveFinished() {
    if (!exports.board.move.action) {
        return true;
    }
    return exports.board.move.state == moveState.complete;
}
exports.moveFinished = moveFinished;
function setBoardBitmap(boardBitMapString) {
    var bitmap = boardBitMapString.split('-').map(a => {
        return parseInt(a);
    }).filter(a => {
        return !isNaN(a) && a >= 0 && a <= 255;
    });
    if (bitmap.length != 8) {
        return "Error-StringMustBeADashSeparatedListOf8Numbers";
    }
    exports.board.bitmap = bitmap;
    return "success";
}
exports.setBoardBitmap = setBoardBitmap;
function getBoardBitMapString() {
    return exports.board.bitmap.join('-');
}
exports.getBoardBitMapString = getBoardBitMapString;
function getGameState() {
}
exports.getGameState = getGameState;
