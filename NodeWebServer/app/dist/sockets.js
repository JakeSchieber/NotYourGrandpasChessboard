"use strict";
var data = require('./data');
var Chess = require('chess.js').Chess;
var chessGameAr = [new Chess()];
var mockboardFen = new Chess().fen();
var mockboardBitmap = [255, 255, 0, 0, 0, 0, 255, 255];
function socketInit(io) {
    io.on('connection', function (socket) {
        console.log("Connection Established.");
        var bitMapString = data.getBoardBitMapString();
        setInterval(function () {
            if (bitMapString != data.getBoardBitMapString()) {
                console.log("The value has changed!!!!");
                socket.emit('bluetoothPoll', { newData: data.board.bitmap });
                bitMapString = data.getBoardBitMapString();
            }
        }, 100);
        var user = new User();
        socket.on('setToGameDemo', function () {
            console.log("setting to demo board");
            user.joinDemoBoard(0);
            socket.join(user.board.idString());
            socket.emit('boardInit', user.board.getState(null));
        });
        socket.on('setToMockboard', function () {
            console.log("setting to mockboard");
            user.joinMockBoard();
            socket.join(user.board.idString());
            socket.emit('boardInit', user.board.getState(null));
            var mockboardPoll = function () {
                socket.emit('mockboardPoll', user.board.getState(null));
                if (user.board.isMockboardType) {
                    setTimeout(mockboardPoll, 250);
                }
            };
        });
        socket.on('subscribeToMockboardPoll', function () {
            socket.join('mockboardPoll');
            console.log("user subscribed to mockboard poll");
            socket.emit('mockboardInit', getMockBoardPackage());
        });
        var mockboardPoll = function () {
            io.sockets.in('mockboardPoll').emit('mockboardPoll', getMockBoardPackage());
            setTimeout(mockboardPoll, 1000);
        };
        mockboardPoll();
        socket.on('boardRequest', function () {
            socket.emit('boardInit', user.board.getState(null));
        });
        socket.on('moveRequest', function (data) {
            console.log("Move request received...");
            if (user.board.isMockboardType || !data.move) {
                console.log("Move request rejected.");
                socket.emit('moveRejected', user.board.getState(null));
                return;
            }
            var move = user.game.move(data.move);
            if (move) {
                console.log("Move request accepted.");
                socket.broadcast.to(user.board.idString()).emit('boardUpdate', user.board.getState(data.move));
            }
            else {
                console.log("Move request rejected.");
                socket.emit('moveRejected', user.board.getState(null));
            }
        });
        socket.on('updateMockboard', function (data) {
            console.log("updateMockboard requested received!!!!");
            if (user.board.isDemoType || !data.boardFen) {
                console.log("Move request rejected.");
                socket.emit('moveRejected', user.board.getState(null));
                return;
            }
            mockboardFen = data.boardFen;
            mockboardBitmap = data.boardBitmap;
            socket.broadcast.to(user.board.idString()).emit('boardUpdate', user.board.getState(null));
            console.log("Mockboard updated");
        });
        socket.on('forceUpdateMockboard', function (data) {
            console.log("forceUpdateMockboard requested received!!!!");
            mockboardFen = data.boardFen;
            mockboardBitmap = data.boardBitmap;
            socket.broadcast.emit('boardUpdateFromRealGame', getMockBoardPackage());
        });
        socket.on('restartGame', function () {
            user.board.restartGame();
            let resetBoard = user.board.getState(null);
            resetBoard.isReset = true;
            socket.broadcast.to(user.board.idString()).emit('boardUpdate', resetBoard);
            socket.emit('boardUpdate', resetBoard);
        });
        socket.on('disconnect', function () {
            console.log('Connection Destroyed.');
        });
    });
}
exports.socketInit = socketInit;
var BoardType;
(function (BoardType) {
    BoardType[BoardType["demo"] = 0] = "demo";
    BoardType[BoardType["mockboard"] = 1] = "mockboard";
})(BoardType || (BoardType = {}));
class User {
    constructor() {
        this.board = new Board(0, BoardType.demo);
    }
    get game() {
        return this.board.game;
    }
    setBoard(board) {
        this.board = board;
    }
    joinDemoBoard(gameId) {
        this.board = new Board(gameId, BoardType.demo);
    }
    joinMockBoard() {
        this.board = new Board(0, BoardType.mockboard);
    }
}
class Board {
    constructor(gameId, type) {
        this.gameId = gameId;
        this.type = type;
    }
    get game() {
        return this.isDemoType ? chessGameAr[this.gameId] : null;
    }
    get isDemoType() {
        return this.type == BoardType.demo;
    }
    get isMockboardType() {
        return this.type == BoardType.mockboard;
    }
    getState(move) {
        if (this.isDemoType) {
            let ret = {
                turn: this.game.turn(),
                boardFen: this.game.fen(),
                move: move,
                history: this.game.history({ verbose: true })
            };
            return ret;
        }
        return {
            boardFen: mockboardFen
        };
    }
    idString() {
        return 'B' + this.type + this.gameId;
    }
    restartGame() {
        if (this.type == BoardType.demo) {
            chessGameAr[this.gameId] = new Chess();
            return;
        }
        mockboardFen = new Chess().fen();
    }
}
function getMockBoardPackage() {
    return {
        boardFen: mockboardFen,
        boardBitmap: mockboardBitmap
    };
}
