'use strict';

var sol     = require("./src/sol"),
    logging = require("./src/logger"),

    watchers = require('./src/watchers');



sol.on('open', function (err) {
        if (err) {
            console.err(err);
            return;
        }

        console.log('Sol is connected to Slack.');
        for (var i = 0; i < watchers.length; ++i) {
            watchers[i](sol, logging);
        }})
   .on('error', function (err) { logging.error(err); });

sol.login();
