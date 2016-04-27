"use strict";
var co = require('co');
var myName = "No one named me";
var data = require('./../data');
module.exports = function (app) {
    app.get('/api/updateBoard/:data', function (req, res) {
        res.send(data.setBoardBitmap(req.params.data));
    });
    app.get('/api/getCurrentBoard', function (req, res) {
        res.send(data.getBoardBitMapString());
    });
    app.get('/api/getMove', function (req, res) {
        res.send(data.board.move.action ? data.board.move.action : "00-00");
    });
    app.get('/api/moveFinished/:move', function (req, res) {
        res.send(data.finishMove(req.params.move));
    });
    app.get('/api/resetRequest', function (req, res) {
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
