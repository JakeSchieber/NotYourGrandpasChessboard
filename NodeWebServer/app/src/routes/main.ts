/// <reference path="../../../typings/tsd.d.ts" />
"use strict";

var co = require('co');

var myName = "No one named me";

import data = require('./../data');

module.exports = function(app) {
  /**
   * Super sequence, get move and update board capsense readings
   * 
   * Currently we print out when we receive data.
   */
  app.get('/api/dopeAFMoveSequence/:data', function(req, res) {
    //var timestamp = new Date().getTime();
    // console.log(timestamp + ": " + req.params.data);
    
    // var timestamp = new Date().getTime();
    // console.log(timestamp + ": " + data.getBoardBitMapString());
    // console.log("settled: " + data.boardIsSuperSettled());
    // console.log("state: " + data.board.state);
      
      
    // set the new board bitmap and console an error if not a success
    if(data.setBoardBitmap(req.params.data).indexOf("success") < 0) {
      console.log("invalid post to bitmap");
    }
    res.send(data.board.move.action ? data.board.move.action : "00-00-00");
  });
  
  
  app.get('/api/setPostMockBoardMoves/:bool', function(req, res) {
    if(req.params.bool != "true" && req.params.bool != "false") {
      res.send("Error-NotPostingTrueOrFalse");
      return;
    }
    data.setPostMockBoardMoves(req.params.bool == "true");
    res.send("success");
  });
  app.get('/api/getPostMockBoardMoves', function(req, res) {
    res.send(data.board.postMockBoardMoves);
  });
  
  /**
   * Sudo Bluetooth calls.
   * Due to a crappy bluetooth module we are just going to poll data to the server with wget
   * requests instead of actually using the bluetooth module.
   */
  app.get('/api/updateBoard/:data', function(req, res) {
    var timestamp = new Date().getTime();
    console.log(timestamp + ": " + req.params.data);
    // set the new board bitmap and return the response string
    res.send(data.setBoardBitmap(req.params.data));
  });
  
  /**
   * Returns whichever board is sent last.
   * 
   * NOTE: There is no need for anyone to ever actually use this method.
   * We have it because its fun.
   */
  app.get('/api/getCurrentBoard', function(req, res) {
    res.send(data.getBoardBitMapString());
  });
  
  /**
   * Returns either the current move that we are requesting, or the last move that was made.
   * This will be diffed by the baord who, on a new diff, will know that a new move is needed.
   * NOTE: This returns "00-00-00" on a fresh game as the board has not yet made any moves.
   */
  app.get('/api/getMove', function(req, res) {
    res.send(data.board.move.action ? data.board.move.action : "00-00-00");
  });
  
  /**
   * Signals a reset request from the board.
   * When this goes high, the boward waits until confirmation of reset from the gameState APU 
   */
  app.get('/api/resetRequest', function(req, res) {
    res.send(data.setReset(true));
  });
  
  /**
   * Returns the current game state string from the data object
   */
  app.get('/api/gameState', function(req, res) {
    
  });
  
  /**
   * Allows for the app to force request a move through rest.
   */
  app.get('/api/forceMove/:move', function(req, res) {
    // validate that string!
    res.send(data.requestMove(req.params.move));
  })
  
  /**
   * Temp tester method.
   */
  app.get('/api/test', function(req, res) {
    console.log("/api/test [GET] received");
    res.send("success!");
  });
};