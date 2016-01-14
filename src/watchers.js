'use strict';

// Threse are passed in via MTA_Subway_SIRI_Server_data_watcher
var sol_bot,
    log;

var request = require('request'),
    parseXML = require('xml2js').parseString;

var stop_ids = require('./stopIDs');

var sentMessage = false;

var stopMonitoringCallsPerSecond = 20;

var toobusyErrorMessage = "Server is temporarily too busy. Please try again.",
    toobusyErrors = [],     // Holds posix timestamps of the toobusy errors.
    TOOBUSY_THRESHOLD = 50; // Acceptable number of toobusy 503 errors per 100 seconds.


function MTA_Subway_SIRI_Server_data_watcher (_sol_bot, _log) {
    sol_bot = _sol_bot;
    log = _log;

    var vehicleMonitoringURL_json = 'http://localhost:16180/api/siri/vehicle-monitoring.json',
        vehicleMonitoringWithCallsURL_json = vehicleMonitoringURL_json + '?VehicleMonitoringDetailLevel=calls',

        vehicleMonitoringURL_xml = 'http://localhost:16180/api/siri/vehicle-monitoring.xml',
        vehicleMonitoringWithCallsURL_xml = vehicleMonitoringURL_xml + '?VehicleMonitoringDetailLevel=calls';

    watcherFactory(function () { return vehicleMonitoringURL_json; }, 'json', 500);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_json; }, 'json', 500);

    watcherFactory(function () { return vehicleMonitoringURL_xml; }, 'xml', 500);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_xml; }, 'xml', 500);

    watcherFactory(getRandomStopMonitoringURL.bind(null, 'json'), 'json', 1000 / stopMonitoringCallsPerSecond);   
    watcherFactory(getRandomStopMonitoringURL.bind(null, 'xml'), 'xml', 1000 / stopMonitoringCallsPerSecond);   
}


function getRandomStopMonitoringURL (dataFormat) {
    return 'http://localhost:16180/api/siri/stop-monitoring.' + dataFormat + '?' + 
            'MonitoringRef=MTA_' + stop_ids[Math.floor(stop_ids.length * Math.random())] +
            ((Math.random() > 0.5) ?  '&StopMonitoringDetailLevel=calls' : '');
}



function watcherFactory (urlGetter, format, intervalTimeout) {
    var channel = sol_bot.getChannelByName('sol-bot') ,  // jshint ignore:line 

        all_good      = true ,
        connect_retry = 0 ,
        parsing_retry = 0 ;
	

    function parsingErrorHandler (e, body) {
        console.error('e:', e);

        if ((connect_retry++ % 3) === 0) {
            log.error('ERROR while parsing the response.', { body : body, retry: parsing_retry });
        }

        all_good = false;

        if (!sentMessage && (parsing_retry++ === 10)) {
            sentMessage = true;
            //channel.send('MTA_Subway_SIRI_Server is sending bad data.');
            console.log('MTA_Subway_SIRI_Server is sending bad data.');
        } 
    }

    setInterval(function () {

        var url   = urlGetter();

        request(
            
            { url: url, }, 
        
            function (error, response, body) {

                var timestamp = Math.floor(Date.now() / 1000),
                    resBodyJSON;

                toobusyErrors = toobusyErrors.filter(function (ts) {
                    return (timestamp - ts) < 100;   // Filter out the timestamps older than 100 seconds.
                });

                if (error || (!response) || (response.statusCode !== 200)) {

                    resBodyJSON = response && response.body && JSON.parse(response.body);

                    if ( response && (response.statusCode === 503) && (resBodyJSON.error === toobusyErrorMessage)) {

                        toobusyErrors.push(timestamp);

                        if (toobusyErrors.length > TOOBUSY_THRESHOLD) {
                            console.log("\n===== toobusy error rate exceeded threshold =====");
                            console.log("\terror rate : " + toobusyErrors.length + " in last 100 sec)");
                            console.log("\tthreshold  : " + TOOBUSY_THRESHOLD + "\n");
                            log.error("ERROR: toobusy 503 threshold rate exceeded.");
                        }

                    } else {
                        console.log('===== server response error besides toobusy =====');
                        console.log('url: ', url);
                        console.log("Error:", error);
                        console.log("response.statusCode", response && response.statusCode);
                        console.log("response.body", response && response.body);
                    }

                    if (all_good) {
                        log.error('ERROR: MTA_Subway_SIRI_Server is down.', { error: error });
                    } else {
                        if ((++connect_retry % 4) === 0) {
                            log.error('ERROR: MTA_Subway_SIRI_Server is still down.', 
                                        { error: error, retry: connect_retry });
                        }
                    }

                    if (!sentMessage && (connect_retry === 10)) {
                        sentMessage = true;
                        //channel.send('The MTA_Subway_SIRI_Server is down.');
                        console.log('The MTA_Subway_SIRI_Server is down.');
                    }

                    all_good = false;

                    return;
                }

                connect_retry = 0;

                try {
                    if (format === 'json') {
                        JSON.parse(body);
                    } else {
                        parseXML(body, function (e) {
                            if (e) { 
                                parsingErrorHandler(e, body); 
                            }
                        });
                    }
                    all_good = true;
                    parsing_retry = 0;
                } catch (e) {
                    parsingErrorHandler(e, body);
                } finally {
                    body = null;
                }
            }
        );
                
    }, intervalTimeout);
}


module.exports = [ MTA_Subway_SIRI_Server_data_watcher, ];
