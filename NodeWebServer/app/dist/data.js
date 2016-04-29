var gameState = {
    uninitialized: "uninitialized",
    over: "over",
    whiteMove: "whiteMove",
    blackMove: "blackMove",
    waitingForFirstMove: "waitingForFirstMove"
};
exports.board = {
    bitmap: [],
    move: {
        action: null,
        state: null
    },
    reset: false,
    gameState: gameState.uninitialized,
    postMockBoardMoves: false
};
var moveState = {
    complete: "complete",
    inProgress: "inProgress",
    ready: "ready"
};
function requestMove(moveString) {
    if ("00-00") {
        exports.board.move.action = moveString;
        exports.board.move.state = moveState.ready;
        return "success-reset";
    }
    var moveAr = moveString.split('-');
    if (moveAr.length != 2) {
        return "Error-InvalidMoveStringRequested (1)";
    }
    else if (moveAr[0].length != 2 || moveAr[1].length != 2) {
        return "Error-InvalidMoveStringRequested (2)";
    }
    var mov1a = parseInt(moveAr[0].substring(0, 1));
    var mov1b = parseInt(moveAr[0].substring(1, 2));
    var mov2a = parseInt(moveAr[1].substring(0, 1));
    var mov2b = parseInt(moveAr[1].substring(1, 2));
    if (isNaN(mov1a) || isNaN(mov1b) || isNaN(mov2a) || isNaN(mov2b)) {
        return "Error-InvalidMoveStringRequested (3)";
    }
    else if (mov1a < 1 || mov1a > 8 || mov1b < 1 || mov1b > 8 || mov2a < 1 || mov2a > 8 || mov2b < 1 || mov2b > 8) {
        return "Error-InvalidMoveStringRequested (4)";
    }
    exports.board.move.action = moveString;
    exports.board.move.state = moveState.inProgress;
    return "success";
}
exports.requestMove = requestMove;
function resetMove() {
    exports.board.move.action = "00-00";
    exports.board.move.state = moveState.ready;
}
exports.resetMove = resetMove;
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
function setReset(high) {
    exports.board.reset = high;
    return "success";
}
exports.setReset = setReset;
function getGameState() {
    return exports.board.gameState;
}
exports.getGameState = getGameState;
function setPostMockBoardMoves(bool) {
    exports.board.postMockBoardMoves = bool;
}
exports.setPostMockBoardMoves = setPostMockBoardMoves;
function locationToColRowRep(loc) {
    var col;
    switch (loc.charAt(0)) {
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
exports.locationToColRowRep = locationToColRowRep;
function moveToMoveString(move) {
    var start = locationToColRowRep(move.from);
    var end = locationToColRowRep(move.to);
    return start.row + '' + start.col + "-" + end.row + '' + end.col;
}
exports.moveToMoveString = moveToMoveString;
