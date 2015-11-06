'use strict';

// Threse are passed in via MTA_Subway_SIRI_Server_data_watcher
var sol_bot,
    log;

var request = require('request'),
    parseXML = require('xml2js').parseString;

var stop_ids = require('./stopIDs');

var sentMessage = false;

function MTA_Subway_SIRI_Server_data_watcher (_sol_bot, _log) {
    sol_bot = _sol_bot;
    log = _log;

    var vehicleMonitoringURL_json = 'http://localhost:16180/api/siri/vehicle-monitoring.json',
        vehicleMonitoringWithCallsURL_json = vehicleMonitoringURL_json + '?VehicleMonitoringDetailLevel=calls',

        vehicleMonitoringURL_xml = 'http://localhost:16180/api/siri/vehicle-monitoring.xml',
        vehicleMonitoringWithCallsURL_xml = vehicleMonitoringURL_xml + '?VehicleMonitoringDetailLevel=calls';

    watcherFactory(function () { return vehicleMonitoringURL_json; }, 'json', 30000);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_json; }, 'json', 30000);

    watcherFactory(function () { return vehicleMonitoringURL_xml; }, 'xml', 30000);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_xml; }, 'xml', 30000);

    watcherFactory(getRandomStopMonitoringURL.bind(null, 'json'), 'json', 100);   
    watcherFactory(getRandomStopMonitoringURL.bind(null, 'xml'), 'xml', 100);   
}



function getRandomStopMonitoringURL (dataFormat) {
    return 'http://localhost:16180/api/siri/stop-monitoring.' + dataFormat + '?' + 
            'MonitoringRef=MTA%20' + stop_ids[Math.floor(stop_ids.length * Math.random())] +
            ((Math.random() > 0.5) ?  '&StopMonitoringDetailLevel=calls' : '');
}



function watcherFactory (urlGetter, format, timeout) {
    var channel = sol_bot.getChannelByName('sol-bot') ,  // jshint ignore:line 

        all_good      = true ,
        connect_retry = 0    ,
        parsing_retry = 0    ;
	

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

        console.log(url);

        request({
                    url: url,
                    //timeout: 10000,
                }, 
            
                function (error, response, body) {


                    if (error || (!response) || (response.statusCode !== 200)) {

                        if (response) {
                            console.error('response.statusCode:', response.statusCode);
                        }

                        if (all_good) {
                            log.error('ERROR: MTA_Subway_SIRI_Server is down.', { error: error });
                        } else {
                            if ((++connect_retry % 3) === 0) {
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
                });
                
            }, timeout);
    }


module.exports = [ MTA_Subway_SIRI_Server_data_watcher, ];
