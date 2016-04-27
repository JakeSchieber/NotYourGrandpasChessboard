/// <reference path="../../typings/tsd.d.ts" />
"use strict";

/**
 * The creation of the SocketIO.Server connection requires the created
 * http server reference. This is created in server.js and passed in as
 * an argument to the socketInit function.
 */
import mongoose = require('mongoose');
import * as SocketIO from 'socket.io';

import data = require('./data');

// no tsd exists for chess.js
var Chess = require('chess.js').Chess;

// Global game array. Must initialize with a game. Eventually develop logic to push a new game.
var chessGameAr = [new Chess()];
// mockboardFen is a unique global test board that is only a stored FEN string
var mockboardFen = new Chess().fen();
var mockboardBitmap = [255, 255, 0, 0, 0, 0, 255, 255];

export function socketInit(io: SocketIO.Server) {
  io.on('connection', function (socket) {
    console.log("Connection Established.");
    
    // cache a copy of the data: Note must not use objects else this will just be a pointer
    var dataCopy = data.board.data;
    // This is the replacement to the bluetooth logic
    setInterval(function() {      
      // just outputting to everybody, but we could jost output to those in lobby
      if(dataCopy != data.board.data) {
        // hoping that this triggers on everybody...
        console.log("The value has changed!!!!");
        socket.emit('bluetoothPoll', { newData: data.board.data});
        dataCopy = data.board.data;
      }
    }, 100);
    
    // create a new user, this will default their game.
    var user = new User();
    
    // set board to demo board and return new board
    socket.on('setToGameDemo', function() {
      console.log("setting to demo board");
      user.joinDemoBoard(0); // force the joining of board 0 ATM
      socket.join(user.board.idString());
      socket.emit('boardInit', user.board.getState(null));
    });
    
    // set board to mock board and return new board
    socket.on('setToMockboard', function() {
      console.log("setting to mockboard");
      user.joinMockBoard();
      socket.join(user.board.idString());
      // mockboard only ever returns fen
      socket.emit('boardInit', user.board.getState(null));
      
      // Create a poll that the phone wll be able to diff and handle.
      var mockboardPoll = function() {
        socket.emit('mockboardPoll', user.board.getState(null));
        if(user.board.isMockboardType) {
          setTimeout(mockboardPoll, 250);
        }
      }
    });
    
    // if you subscribe to the mockboardPoll it means that you want to get updates about the status of
    // the mockboard but not control it.
    socket.on('subscribeToMockboardPoll', function() {
      socket.join('mockboardPoll');
      console.log("user subscribed to mockboard poll");
      socket.emit('mockboardInit', getMockBoardPackage());
    });
    var mockboardPoll = function() {
      // emit the poll to all users who have subscribed to it.
      io.sockets.in('mockboardPoll').emit('mockboardPoll', getMockBoardPackage());
      setTimeout(mockboardPoll, 1000);
      
    }
    mockboardPoll();
    
    // just return the current board
    socket.on('boardRequest', function() {
      socket.emit('boardInit', user.board.getState(null));
    });
    
    /**
     * Make a move on the demo board
     */
    socket.on('moveRequest', function(data) {
      console.log("Move request received...");
      if(user.board.isMockboardType || !data.move) {
        // move was rejected because wrong board type or missing data
        console.log("Move request rejected.");
        socket.emit('moveRejected', user.board.getState(null));
        return;
      }
      
      var move = user.game.move(data.move);
      if(move) {
        // move was accepted
        console.log("Move request accepted.");
        socket.broadcast.to(user.board.idString()).emit('boardUpdate', user.board.getState(data.move));
      } else {
        // move was rejected because it was an invalid move
        console.log("Move request rejected.");
        socket.emit('moveRejected', user.board.getState(null));
      }
    });
    
    /**
     * Make a move on the mockboard
     */
    socket.on('updateMockboard', function(data) {
      console.log("updateMockboard requested received!!!!");
      if(user.board.isDemoType || !data.boardFen) {
        // move was rejected because wrong board type or missing data
        console.log("Move request rejected.");
        socket.emit('moveRejected', user.board.getState(null));
        return;
      }
      
      // just directly accepts the fen string with no valdation.
      mockboardFen = data.boardFen;
      mockboardBitmap = data.boardBitmap;
      socket.broadcast.to(user.board.idString()).emit('boardUpdate', user.board.getState(null));
      console.log("Mockboard updated");
    });
    
    /**
     * Forces an update of the mockboard.
     * Issued by the phone.
     * This method allows for us to bypass the game logic associated with the current game so that the phone
     * can interact with 2 games at a time.
     */
    socket.on('forceUpdateMockboard', function(data) {
      console.log("forceUpdateMockboard requested received!!!!");
      
      // just directly accepts the fen string with no valdation.
      mockboardFen = data.boardFen;
      mockboardBitmap = data.boardBitmap;
      
      // without the boardIdString we cannot submit the board update... We will need to cache this locally on the phone.
      socket.broadcast.emit('boardUpdateFromRealGame', getMockBoardPackage());
    });
    
    // We should gate this with a permissions check. Perhaps ask all players???
    socket.on('restartGame', function() {
      user.board.restartGame();
      // flag resetBoard goes high so that we can alert the app not to trigger a boardUpdate hangler.
      let resetBoard: any = user.board.getState(null);
      resetBoard.isReset = true;
      socket.broadcast.to(user.board.idString()).emit('boardUpdate', resetBoard);
      
      // We no longer want to emit the boardUpdate to the host, going to force the user to drag the pieces...
      socket.emit('boardUpdate', resetBoard);
    })
    
    // @ what point do we want to destroy the game?...
    socket.on('disconnect', function(){
      // remove this user's id from all boards?
      // destroy game?
			console.log('Connection Destroyed.');
		});
    
  });
}

/**
 * Represents the twp board types that we can have.
 *  DEMO: Follows strict rules
 *  MOCKBOARD: Is simply a FEN string and requires no game rules to be followed.
 */
enum BoardType {
    demo,
    mockboard
}

interface boardUpdate {
  turn?: any,
  boardFen: any,
  move?: any, // required on move, not on init
  history: any // an array of verbose chess history.
}

class User {
    board: Board;
    constructor() {
      // on user creation we automatically set them up demo board 1
      this.board = new Board(0, BoardType.demo);
    }
    
    /**
     * Can only return a game object if the current board is of type demo.
     */
    get game() {
      return this.board.game;
    }
    
    /**
     * Sets the user's gameboard accordingly.
     */
    setBoard(board) {
      this.board = board;
    }
    
    joinDemoBoard(gameId) {
      this.board = new Board(gameId, BoardType.demo)
    }
    joinMockBoard() {
      this.board = new Board(0, BoardType.mockboard);
    }
}

class Board {
  constructor(public gameId: number, public type: BoardType) { }
  
  /**
   * Returns the chess game for the current board (NOTE: not applicable for mockboard)
   */
  get game() {
    return this.isDemoType ? chessGameAr[this.gameId] : null; 
  }
  
  /**
   * Boolean type methods
   */
  get isDemoType() {
    return this.type == BoardType.demo;
  }
  get isMockboardType() {
    return this.type == BoardType.mockboard;  
  }
  
  /**
   * Returns the current game state which can be consumed by the front end experiences
   */
  getState(move) {
    if(this.isDemoType) {
      let ret: boardUpdate = {
        turn: this.game.turn(),
        boardFen: this.game.fen(),
        move: move,
        history: this.game.history({ verbose: true })
      }
      return ret;
    }
    return {
      boardFen: mockboardFen
    }
  }
  
  /**
   * Creates a board string which can be used to send game room updates to the proper users.
   */
  idString() {
    return 'B'+ this.type + this.gameId;
  }
  
  /**
   * Resets the current board of chess.
   */
  restartGame() {
    if(this.type == BoardType.demo) {
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
    }
}