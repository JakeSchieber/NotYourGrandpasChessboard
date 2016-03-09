"use strict";
var co = require('co');
module.exports = function (app) {
    app.post('/api/test', function (req, res) {
        res.send("success!");
    });
};
