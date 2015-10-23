'use strict';

var http = require('http');



function MTA_Subway_SIRI_Server_time_watcher (sol_bot, log) {
    //var channel = sol_bot.getChannelByName('mta-gtfsr2siri') ,
    var channel = sol_bot.getChannelByName('sol-bot') ,  /* jshint ignore:line */ //This channel is for testing.

        all_good = true ,
        retry    = 0    ,

        last_gtfsrt_timestamp = Number.NEGATIVE_INFINITY;

    setInterval(function () {

        http.get('http://mars.availabs.org:16180/admin/get/GTFS-Realtime/feed-reader/lastReadTimestamp', function (res) {
            res.on('data', function (d) {
                var this_gtfsrt_timestamp;

                try {
                    this_gtfsrt_timestamp = parseInt(d.toString());

                    if (this_gtfsrt_timestamp <= last_gtfsrt_timestamp) {

                        last_gtfsrt_timestamp = this_gtfsrt_timestamp;

                        if ((++retry % 5) === 0) {
                            all_good = false;
                            log.error('WARN: MTA_Subway_SIRI_Server may not be updating the realtime data.', { retry: retry });
                        }

                        if (retry === 10) {
                            channel.send('MTA_Subway_SIRI_Server may not be updating the realtime data.');
                        }

                    } else {
                        all_good = true;
                        retry = 0;
                        last_gtfsrt_timestamp = this_gtfsrt_timestamp;
                    }
                } catch (e) {
                    log.error(e);
                }
            });
        }).on('error', function (e) {
            log.error(e);
            return; 
        });
    }, 30000);
}


function MTA_Subway_SIRI_Server_data_watcher (sol_bot, log) {
    //var channel = sol_bot.getChannelByName('mta-gtfsr2siri') ,
    var channel = sol_bot.getChannelByName('sol-bot') ,  // jshint ignore:line 

        all_good      = true ,
        connect_retry = 0    ,
        parsing_retry = 0    ;
	

    setInterval(function () {

        http.get('http://mars.availabs.org:16180/vehicle-monitoring.json?VehicleMonitoringDetailLevel=calls', function (res) {

            var body = '';

            res.on('data', function(d) {
                body += d;
            });

            res.on('end', function() {
                try {
                    JSON.parse(body);
                    all_good = true;
                    parsing_retry = 0;
                } catch (e) {
                    if ((connect_retry++ % 3) === 0) {
                        log.error('ERROR while parsing the response.', { body : body, retry: parsing_retry });
                    }
                    all_good = false;
                    if (parsing_retry++ === 10) {
                        channel.send('MTA_Subway_SIRI_Server is sending bad data.');
                    } 
                }
            });

        }).on('error', function (err) {

            if (all_good) {
                log.error('ERROR: MTA_Subway_SIRI_Server is down.', { err: err });
            } else {
                if ((++connect_retry % 3) === 0) {
                    log.error('ERROR: MTA_Subway_SIRI_Server is still down.', { err: err, retry: connect_retry });
                }
            }

            if (connect_retry === 10) {
                channel.send('The MTA_Subway_SIRI_Server is down.');
            }

            all_good = false;
      });
    }, 30000);
}

module.exports = [
    MTA_Subway_SIRI_Server_time_watcher, 
    MTA_Subway_SIRI_Server_data_watcher, 
];
