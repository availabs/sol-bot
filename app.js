'use strict';

var sol     = require("./src/sol"),
    logging = require("./src/logger"),

    watchers = require('./src/watchers');



sol.on('open', function (err) {
    if (err) {
        console.err(err);
        return;
    }

    for (var i = 0; i < watchers.length; ++i) {
        watchers[i](sol, logging);
    }
});


sol.login();

