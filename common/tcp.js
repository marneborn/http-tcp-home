/*
 * Common package to send and receive over TCP.
 */
'use strict';

let net = require('net');
let Q   = require('q');

let Code = module.exports.Code = {
    OK         :  0,
    NOK        :  1,
    BADSIZE    :  2,
    EARLYCLOSE :  3
};

function stringify ( message ) {

    let type = typeof(message);
    
    if ( type === 'string' )  return message;
    if ( type === 'function') return stringify(message());
    if ( type === 'object')   return JSON.stringify(message);
    if ( message.toString )   return message.toString();
    return null;
}

// keep a queue of promises to try to keep sends in order at the server.
let queue = Q(true);

module.exports.send = function ( port, host, message, config ) {

    config = config || {};

    queue = queue.then(
        function () {
            let client   = new net.Socket();
            let deferred = Q.defer();
            let logs     = [];
            let string   = stringify(message);
            if ( string === null ) {
                logs.push("Couldn't parse the message into a string");
                string = "";
            }

            // first send the number of characters to expect
            // then send the actual data
            // then close the connection
            client.connect( port, host, function () {
                logs.push("Sending: "+string);
                client.end( string );
                deferred.resolve(logs);
            });

            client.on('error', function ( err ) {
                logs.push("TCP Client emitted an error: "+err);
                client.end();
                deferred.reject(logs);
            });

            if ( config.timeout != null ) {
                client.setTimeout(config.timeout);
            }

            client.on('timeout', function () {
                logs.push("TCP Client timed out");
                client.end();
                deferred.reject(logs);
            });

            client.on('data', function ( data ) {
                console.log("Got back: "+data)
            });

            return deferred.promise;
        }
    );
    return queue;
}

module.exports.createServer = function ( port, callback, errback ) {
    let server = net.createServer();
    server.on('connection', function ( socket ) { 
        console.log(">> "+socket.remoteAddress+":"+socket.remotePort);
        return receive(socket, callback, errback); 
    });
    server.listen(port);
    return server;
};

function receive ( socket, callback, errback ) {

    let buffer = '';

    // accumulate the data as it's received
    socket.on('data', function(data) {
        buffer += data;
    });
    
    socket.on('close', function(data) {
        callback(socket, buffer);
    });
}
