"use strict";
var co = require('co');
module.exports = function (app) {
    app.get('/api/test', function (req, res) {
        console.log("/api/test [GET] received");
        res.send("success!");
    });
};
