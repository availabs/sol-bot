'use strict';

var path   = require('path'),
    bunyan = require('bunyan');


var logFilePath = path.join(__dirname, '../logs/', 'sol.log');


var logger = bunyan.createLogger({
    name: 'sol-log',
    streams: [{
            type: 'rotating-file' ,
            path:  logFilePath    ,
            period: '1d'          ,   // daily rotation
            count: 7              ,   // keep 7 back copies
        }],
});

module.exports = logger;
