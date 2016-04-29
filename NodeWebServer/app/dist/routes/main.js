"use strict";
var co = require('co');
var myName = "No one named me";
var data = require('./../data');
module.exports = function (app) {
    app.get('/api/dopeAFMoveSequence/:data', function (req, res) {
        var timestamp = new Date().getTime();
        console.log(timestamp + ": " + req.params.data);
        if (data.setBoardBitmap(req.params.data).indexOf("success") < 0) {
            console.log("invalid post to bitmap");
        }
        res.send(data.board.move.action ? data.board.move.action : "00-00");
    });
    app.get('/api/setPostMockBoardMoves/:bool', function (req, res) {
        if (req.params.bool != "true" && req.params.bool != "false") {
            res.send("Error-NotPostingTrueOrFalse");
            return;
        }
        data.setPostMockBoardMoves(req.params.bool == "true");
        res.send("success");
    });
    app.get('/api/getPostMockBoardMoves', function (req, res) {
        res.send(data.board.postMockBoardMoves);
    });
    app.get('/api/updateBoard/:data', function (req, res) {
        var timestamp = new Date().getTime();
        console.log(timestamp + ": " + req.params.data);
        res.send(data.setBoardBitmap(req.params.data));
    });
    app.get('/api/getCurrentBoard', function (req, res) {
        res.send(data.getBoardBitMapString());
    });
    app.get('/api/getMove', function (req, res) {
        res.send(data.board.move.action ? data.board.move.action : "00-00");
    });
    app.get('/api/resetRequest', function (req, res) {
        res.send(data.setReset(true));
    });
    app.get('/api/gameState', function (req, res) {
    });
    app.get('/api/forceMove/:move', function (req, res) {
        res.send(data.requestMove(req.params.move));
    });
    app.get('/api/test', function (req, res) {
        console.log("/api/test [GET] received");
        res.send("success!");
    });
};
