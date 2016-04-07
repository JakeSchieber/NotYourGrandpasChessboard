/// <reference path="../../typings/tsd.d.ts" />
"use strict";

/**
 * The creation of the SocketIO.Server connection requires the created
 * http server reference. This is created in server.js and passed in as
 * an argument to the socketInit function.
 */
import mongoose = require('mongoose');
import * as SocketIO from 'socket.io';

// no tsd exists for chess.js
var Chess = require('chess.js').Chess;

// Global game array. Must initialize with a game. Eventually develop logic to push a new game.
var chessGameAr = [new Chess()];

export function socketInit(io: SocketIO.Server) {
  io.on('connection', function (socket) {
    
    // assign user a game board to interact with. Forcing to 0th.
    var userSelectedGame = 0;
    
    // console.log(chess.ascii());
    console.log("Connection Established.");
    
    // on connection we need to be able to emit the board to the new user.
    // socket.emit('boardInit', getBoardState(userUserChess(userSelectedGame), null));
    
    // just return a
    socket.on('boardRequest', function() {
      socket.emit('boardInit', getBoardState(userUserChess(userSelectedGame), null));
    });
    
    socket.on('moveRequest', function(data) {
      console.log("Move request received...");
      var move = userUserChess(userSelectedGame).move(data.move);
      if(move) {
        // move was accepted
        console.log("Move request accepted.");
        socket.broadcast.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), data.move));
      } else {
        // move was rejected
        console.log("Move request rejected.");
        socket.emit('moveRejected', getBoardState(userUserChess(userSelectedGame), null));
      }
    });
    
    // We should gate this with a permissions check. Perhaps ask all players?
    socket.on('restartGame', function() {
      restartGame(userSelectedGame);
      socket.broadcast.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), null));
      socket.emit('boardUpdate', getBoardState(userUserChess(userSelectedGame), null));
    })
    
    // @ what point do we want to destroy the game?...
    socket.on('disconnect', function(){
      // remove this user's id from all boards?
      // destroy game?
			console.log('Connection Destroyed.');
		});
  });
}

interface boardUpdate {
  turn: any,
  boardFen: any,
  move?: any // required on move, not on init
}
/**
 * handles the constant return of the game variable required by the front end.
 */
function getBoardState(chessBoard, move) {
  let ret: boardUpdate = {
    turn: chessBoard.turn(),
    boardFen: chessBoard.fen(),
    move: move
  }
  return ret;
}

/**
 * Restart the game of chess which the current user has selected.
 */
function restartGame(userSelectedGame) {
  chessGameAr[userSelectedGame] = new Chess();
}

/**
 * Global game of chess that may change freely, on every access we should freshly get,
 * else on conditions like board resets we are pointing to the wrong game of chess.
 */
function userUserChess(userSelectedGame) {
  return chessGameAr[userSelectedGame];
}