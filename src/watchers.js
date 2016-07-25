'use strict';

var hostURL = 'http://localhost:16183/api/siri/'
//var hostURL = 'http://siri.mta.availabs.org/api/siri/'
//var hostURL = 'http://siri.mta.lline.availabs.org/api/siri/'
//var hostURL = 'http://siri.mta.statenisland.availabs.org/api/siri/'
//var hostURL = 'http://siri.mta.lirr.availabs.org/api/siri/'

//var stopIDs = require('./mtaSubwayStopIDs');
//var stopIDs = require('./mtaLLineStopIDs');
//var stopIDs = require('./statenIslandStopIDs');
var stopIDs = require('./lirrStopIDs');


// Threse are passed in via MTA_Subway_SIRI_Server_data_watcher
var sol_bot,
    log;

var request = require('request'),
    parseXML = require('xml2js').parseString;

var sentMessage = false;

var toobusyErrorMessage = "Service Unavailable: Back-end server is at capacity.",
    toobusyErrors = [],     // Holds posix timestamps of the toobusy errors.
    TOOBUSY_THRESHOLD = 50; // Acceptable number of toobusy 503 errors per 120 seconds.

function MTA_Subway_SIRI_Server_data_watcher (_sol_bot, _log) {
    sol_bot = _sol_bot;
    log = _log;

    var vehicleMonitoringURL_json = hostURL + 'vehicle-monitoring.json',
        vehicleMonitoringWithCallsURL_json = vehicleMonitoringURL_json + '?VehicleMonitoringDetailLevel=calls',

        vehicleMonitoringURL_xml = hostURL + '/vehicle-monitoring.xml',
        vehicleMonitoringWithCallsURL_xml = vehicleMonitoringURL_xml + '?VehicleMonitoringDetailLevel=calls';

    watcherFactory(function () { return vehicleMonitoringURL_json; }, 'json', 500);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_json; }, 'json', 500);

    watcherFactory(function () { return vehicleMonitoringURL_xml; }, 'xml', 500);
    watcherFactory(function () { return vehicleMonitoringWithCallsURL_xml; }, 'xml', 500);

    watcherFactory(getRandomStopMonitoringURL.bind(null, 'json'), 'json', 10);   
    watcherFactory(getRandomStopMonitoringURL.bind(null, 'xml'), 'xml', 10);   
}


function getRandomStopMonitoringURL (dataFormat) {
    return hostURL + '/stop-monitoring.' + dataFormat + '?' + 
            'MonitoringRef=MTA_' + stopIDs[Math.floor(stopIDs.length * Math.random())] +
            ((Math.random() > 0.5) ?  '&StopMonitoringDetailLevel=calls' : '');
}



function watcherFactory (urlGetter, format, intervalTimeout) {
    var channel = sol_bot ? sol_bot.getChannelByName('sol-bot') : null,  // jshint ignore:line 

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
            if (channel) {
              channel.send('MTA_Subway_SIRI_Server is sending bad data.');
            }
            console.log('MTA_Subway_SIRI_Server is sending bad data.');
        } 
    }

    setInterval(function () {

        var url   = urlGetter();

        request(
            
            { url: url, }, 
        
            function (error, response, body) {

                var timestamp = Math.floor(Date.now() / 1000),
                    resBodyJSON,
                    x;

                toobusyErrors = toobusyErrors.filter(function (ts) {
                    return (timestamp - ts) < 120;   // Filter out the timestamps older than 100 seconds.
                });

                if (error || (!response) || (response.statusCode !== 200)) {
                  console.log(url)

                  if (!(response && response.body)) {
                    return console.error("No body in error response.")
                  }

                  var errResponseBodyParser = 
                        (format === 'json') ? jsonErrResponseBodyParser : xmlErrResponseBodyParser

                  return errResponseBodyParser(response.body, function (err, resBodyJSON) {
                    if (err) {
                      return console.error(err.stack || err)  
                    }

                    if (response && (response.statusCode === 503)&&
                       ((x = resBodyJSON.Siri) && (x = x.ServiceDelivery) && (x = x.StopMonitoringDelivery) &&
                         (Array.isArray(x) && x.leength) && (x[0].OtherError === toobusyErrorMessage))) {

                        toobusyErrors.push(timestamp);
                        console.log(toobusyErrors.length);

                        if (toobusyErrors.length > TOOBUSY_THRESHOLD) {
                            console.log("\n===== toobusy error rate exceeded threshold =====");
                            console.log("\terror rate : " + toobusyErrors.length + " in last 120 sec)");
                            console.log("\tthreshold  : " + TOOBUSY_THRESHOLD + "\n");
                            log.error("ERROR: toobusy 503 threshold rate exceeded.");

                            toobusyErrors = toobusyErrors.slice(toobusyErrors.length / 2);
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
                                { error: error, retry: connect_retry, statusCode: response && response.statusCode });
                        }
                    }

                    if (!sentMessage && (connect_retry === 10)) {
                        sentMessage = true;
                        if (channel) {
                          channel.send('The MTA_Subway_SIRI_Server is down.');
                        }
                        console.log('The MTA_Subway_SIRI_Server is down.');
                    }

                    all_good = false;
                  
                  })
                } // End error handling.


                connect_retry = 0;

                try {
                    if (format === 'json') {
                        JSON.parse(body);
                        all_good = true;
                        parsing_retry = 0;
                        console.log('json')
                    } else {
                        parseXML(body, function (e) {
                            if (e) { 
                                console.log(url)
                                parsingErrorHandler(e, body); 
                            } else {
                                all_good = true;
                                parsing_retry = 0;
                                console.log('xml')
                            }
                        });
                    }
                } catch (e) {
                    console.log(url)
                    parsingErrorHandler(e, body);
                } finally {
                    body = null;
                }
            }
        );
                
    }, intervalTimeout);
}

function jsonErrResponseBodyParser (resBody, cb) {
  try {
    return cb(null, JSON.parse(resBody))
  } catch (err) {
    cb(err)
  }
}

function xmlErrResponseBodyParser (resBody, cb) {
  try {
    return parseXML(resBody, cb)
  } catch (err) {
    return cb(err)
  }
}


module.exports = [ MTA_Subway_SIRI_Server_data_watcher, ];
