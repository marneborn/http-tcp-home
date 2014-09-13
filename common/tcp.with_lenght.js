/*
 * Common package to send and receive over TCP.
 * First send the length of the message, then the message itself.
 * This is probably overkill.
 * Would probably work to have the server keep collecting until the client closes the connection.
 */
'use strict';

let net = require('net');
let Q   = require('q');

let LENGTH_LENGTH = 4;
let MAX_CHARS     = parseInt(Array(LENGTH_LENGTH+1).join('F'), 16);

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

function length2string ( length ) {
    // send the length of the message in LENGTH_LENGTH(4) hex characters
    let hex = length.toString(16);
    let len = hex.len;
    return Array(LENGTH_LENGTH - hex.length+1).join("0") + hex;
}

module.exports.send = function ( port, host, message ) {

    let deferred = Q.defer();
    let client   = new net.Socket();
    let logs     = [];
    let string   = stringify(message);
    if ( string === null ) {
        logs.push("Couldn't parse the message into a string");
        string = "";
    }

    let length   = string.length;

    if ( length > MAX_CHARS ) {
        logs.push("Trying to send a message that is bigger than "+MAX_CHARS+"characters. Will send the whole thing, but the server may not consume it all");
        length = MAX_CHARS;
    }

    // first send the number of characters to expect
    // then send the actual data
    // then close the connection
    client.connect( port, host, function () {
        logs.push("Sending "+length+" characters: "+string);
        client.write  ( length2string(length) );
        client.end    ( string );
        deferred.resolve(logs);
    });

    return deferred.promise;
}

module.exports.createServer = function ( port, host, callback, errback ) {

    let server   = net.createServer()
            .on('connection', function ( socket ) { return receive(socket, callback, errback); })
            .listen(port, host);
    return server;
};

function receive ( socket, callback, errback ) {

    let buffer = '';
    let length = null;

    socket.on('data', function(data) {

        // accumulate the data as it's received
        buffer += data;

        // first need to extract the size of the message.
        // this is always the first LENGTH_LENGTH (4) characters - in hex.
        if (length === null) {
            if ( buffer.length >= LENGTH_LENGTH ) {
                let str = buffer.substring(0,LENGTH_LENGTH);
                buffer = buffer.substring(LENGTH_LENGTH);

                try {
                    length = parseInt(str, 16);

                    // if the length is exactly MAX_CHARS long, wait till end is received.
                    if ( length === MAX_CHARS )
                        length = -1;
                }
                catch (e) {
                    length = -1;
                }
            }
        }

        // can't do anything until the length has been received and parsed
        if ( length === null )
            return;
        
        if ( buffer.length === length ) {
            callback(buffer);
            return;
        }
    });
    
    socket.on('close', function(data) {
        console.log('c1> '+length+','+buffer.length);
        if ( buffer.length !== length ) {
            var code = (length < 0) ? Code.BADSIZE : Code.EARLYCLOSE;
            errback(buffer, code);
        }
    });
}
