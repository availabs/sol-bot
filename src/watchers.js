'use strict';

// Threse are passed in via MTA_Subway_SIRI_Server_data_watcher
var sol_bot,
    log;

var request = require('request'),
    parseXML = require('xml2js').parseString;

var stop_ids = require('./stopIDs');



function MTA_Subway_SIRI_Server_data_watcher (_sol_bot, _log) {
    sol_bot = _sol_bot;
    log = _log;

    var vehicleMonitoringURL_json = 'http://localhost:16180/api/siri/vehicle-monitoring.json',
        vehicleMonitoringWithCallsURL_json = vehicleMonitoringURL_json + '?VehicleMonitoringDetailLevel=calls',

        vehicleMonitoringURL_xml = 'http://localhost:16180/api/siri/vehicle-monitoring.xml',
        vehicleMonitoringWithCallsURL_xml = vehicleMonitoringURL_xml + '?VehicleMonitoringDetailLevel=calls',

        stopMonitoringURL_base =  'http://localhost:16182/api/siri/stop-monitoring',

        i;

    watcherFactory(vehicleMonitoringURL_json, 'json');
    watcherFactory(vehicleMonitoringWithCallsURL_json, 'json');

    watcherFactory(vehicleMonitoringURL_xml, 'xml');
    watcherFactory(vehicleMonitoringWithCallsURL_xml, 'xml');


    for ( i = 0; i < stop_ids.length; ++i ) {
        watcherFactory(stopMonitoringURL_base + '.json?MonitoringRef=MTA%20' + stop_ids[i], 'json');   
        watcherFactory(stopMonitoringURL_base + 
                       '.json?StopMonitoringDetailLevel=calls&MonitoringRef=MTA%20' + 
                       stop_ids[i], 'json');   

        watcherFactory(stopMonitoringURL_base + '.xml?MonitoringRef=MTA%20' + stop_ids[i], 'xml');   
        watcherFactory(stopMonitoringURL_base + 
                       '.xml?StopMonitoringDetailLevel=calls&MonitoringRef=MTA%20' + 
                       stop_ids[i], 'xml');   
    }
}


function watcherFactory (url, format) {
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
        if (parsing_retry++ === 10) {
            channel.send('MTA_Subway_SIRI_Server is sending bad data.');
        } 
    }

    console.log(url);
    setInterval(function () {

        request(url, function (error, reponse, body) {

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
                if (format === 'json') {
                    console.log(JSON.parse(body));
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
            }
        });
        
    }, 30000);
}


module.exports = [ MTA_Subway_SIRI_Server_data_watcher, ];
