var Slack = require('slack-client'),

    token         = require('./token.js'),
    autoReconnect = true,
    autoMark      = true;

module.exports = new Slack(token, autoReconnect, autoMark);

