"use strict";
var Chess = require('chess.js').Chess;
var chessGameAr = [new Chess()];
function socketInit(io) {
    io.on('connection', function (socket) {
        var userSelectedGame = 0;
        console.log("Connection Established.");
        socket.emit('boardInit', getBoardState(userUserChess(userSelectedGame), null));
        socket.on('boardRequest', function () {
            socket.emit('boardInit', getBoardState(userUserChess(userSelectedGame), null));
        });
        socket.on('moveRequest', function (data) {
            console.log("Move request received...");
            var move = userUserChess(userSelectedGame).move(data.move);
            if (move) {
                console.log("Move request accepted.");
                socket.broadcast.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), data.move));
            }
            else {
                console.log("Move request rejected.");
                socket.emit('moveRejected', getBoardState(userUserChess(userSelectedGame), null));
            }
        });
        socket.on('restartGame', function () {
            restartGame(userSelectedGame);
            socket.broadcast.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), null));
            socket.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), null));
        });
        socket.on('disconnect', function () {
            console.log('Connection Destroyed.');
        });
    });
}
exports.socketInit = socketInit;
function getBoardState(chessBoard, move) {
    let ret = {
        turn: chessBoard.turn(),
        boardFen: chessBoard.fen(),
        move: move
    };
    return ret;
}
function restartGame(userSelectedGame) {
    chessGameAr[userSelectedGame] = new Chess();
}
function userUserChess(userSelectedGame) {
    return chessGameAr[userSelectedGame];
}
