/// <reference path="../../../typings/tsd.d.ts" />
"use strict";

var co = require('co');

var myName = "No one named me";

import data = require('./../data');

module.exports = function(app) {
  
  app.get('/api/updateBoard/:data', function(req, res) {
    data.board.data = req.params.data;
    res.send(data.board.data);
  });
  app.get('/api/getCurrentBoard', function(req, res) {
    res.send(data.board.data);
  });
  app.get('/api/getMove', function(req, res) {
    res.send(data.board.exMove);
  });

  app.get('/api/test', function(req, res) {
    console.log("/api/test [GET] received");
    res.send("success!");
  });
};