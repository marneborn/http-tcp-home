'use strict';

let Q      = require('q');
let denon  = require('./denon.js');
let utils  = require('../common/utils');
let tcp    = require('../common/tcp');
let config = require('../config.json');

denon.init( { host : config.denon.IP, port : config.denon.port } );

let message2cmd = {
    'muteoff' : 'MUOFF',
    'muteon'  : 'MUON'
};

tcp
.createServer( config.localPort, callback, errback )
.on('error', function ( err ) { console.log("Error: "+err); } )

console.log('listening to port '+config.localPort);

function callback ( message ) {
    message = message.trim();
    denon.send(message2cmd[message]);
}

function errback ( message, code ) {
    console.log("Problem with message: ("+code+") - "+message);
}


