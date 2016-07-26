This project will continuously make a high volume of requests to an MTA_Subway_SIRI_Server instance and logs problems. 
It will optionally send notifications to Slack if it detects problems, if a Slack token is provided.

####NOTE: This application creates a LARGE amount of network traffic. Pointing it remotely at a cloud-based server *WILL RESULT IN SIGNIFICANT NETWORK TRAFFIC CHARGES*. It is highly recommended to point this app only at `localhost`.

# Deployment Instructions

1. `npm install`
2. provide your Slack token in [`sol-bot/src/slack-token.js`](https://github.com/availabs/sol-bot/blob/master/src/slack-token.js)
3. Assign the hostURL and a set of stopIDs in [`config/watcherConfig.js`](https://github.com/availabs/sol-bot/blob/master/src/watchers.js)
4. `node app.js`
