var Slack = require('slack-client'),

    token         = require('./slack-token.js'),
    autoReconnect = true,
    autoMark      = true;

module.exports = (token) ? new Slack(token, autoReconnect, autoMark) : null;

