This project will continuously make a high volume of requests to an MTA_Subway_SIRI_Server instance and logs problems. 
It will optionally send notifications to Slack if it detects problems, if a Slack token is provided.

# Deployment Instructions

1. Assign the hostURL and a set of stopIDs in `config/watcherConfig.js`
2. `npm install`
3. provide your Slack token in `sol-bot/src/slack-token.js` 
4. `node app.js`
