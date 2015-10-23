'use strict';

var request = require('request');




function MTA_Subway_SIRI_Server_data_watcher (sol_bot, log) {
    var channel = sol_bot.getChannelByName('sol-bot') ,  // jshint ignore:line 

        all_good      = true ,
        connect_retry = 0    ,
        parsing_retry = 0    ,
	
        vehicleMonitoringURL_json = 
            'http://mars.availabs.org:16180/vehicle-monitoring.json';


    setInterval(function () {

        request(vehicleMonitoringURL_json, function (error, reponse, body) {

            if (error || ( reponse.statusCode !== 200 )) {

                console.error('error:', error);
                console.error('reponse.statusCode:', reponse.statusCode);

                if (all_good) {
                    log.error('ERROR: MTA_Subway_SIRI_Server is down.', { error: error });
                } else {
                    if ((++connect_retry % 3) === 0) {
                        log.error('ERROR: MTA_Subway_SIRI_Server is still down.', 
                                    { error: error, retry: connect_retry });
                    }
                }

                if (connect_retry === 10) {
                    channel.send('The MTA_Subway_SIRI_Server is down.');
                }

                all_good = false;

                return;
            }

            try {
                JSON.parse(body);
                all_good = true;
                parsing_retry = 0;
            } catch (e) {
                console.error('e:', e);

                if ((connect_retry++ % 3) === 0) {
                    log.error('ERROR while parsing the response.', { body : body, retry: parsing_retry });
                }
                all_good = false;
                if (parsing_retry++ === 10) {
                    channel.send('MTA_Subway_SIRI_Server is sending bad data.');
                } 
            }
        });
        
    }, 30000);
}

module.exports = [ MTA_Subway_SIRI_Server_data_watcher, ];
