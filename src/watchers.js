'use strict';


var request = require('request');


function MTA_Subway_SIRI_Server_watcher (sol_bot, log) {
    var channel = sol_bot.getChannelByName('mta-gtfsr2siri') ,
    //var channel = sol_bot.getChannelByName('sol-bot') ,  //For testing.

        all_good = true ,
        retry    = 0    ,

        last_timestamp = Number.NEGATIVE_INFINITY;


    setInterval(function () {
        request('http://mars.availabs.org:16180/vehicle-monitoring', function (err, response, body) {

            var this_timestamp;

            console.log("Foo.");
                
            if (err) {
                if (all_good) {
                    log.error('ERROR: MTA_Subway_SIRI_Server is down.', { err: err });
                } else {
                    if ((++retry % 3) === 0) {
                        log.error('ERROR: MTA_Subway_SIRI_Server is still down.', { err: err, retry: retry });
                    }
                }

                if (retry === 10) {
                    channel.send('The MTA_Subway_SIRI_Server is down.');
                }

                all_good = false;

                return;
            } 

            if (response.statusCode === 200) {
                try {
                    this_timestamp = body.Siri.ServiceDelivery.ResponseTimestamp;

                    if (this_timestamp <= last_timestamp) {
                        if ((retry++ % 30) === 0) {
                            log.warn({ msg: 'WARN: MTA_Subway_SIRI_Server not updating the realtime data.', retry: retry });
                        }

                        if (retry === 10) {
                            channel.send('MTA_Subway_SIRI_Server is not updating the realtime data.');
                        }

                    } else {
                        all_good = true;
                        retry = 0;
                        last_timestamp = this_timestamp;
                    }
                } catch (e) {
                    if (retry++ === 10) {
                        channel.send('MTA_Subway_SIRI_Server is sending mangled data.');
                    } 
                }
            }
        });
    }, 3000);
}

module.exports = [
    MTA_Subway_SIRI_Server_watcher, 
];
