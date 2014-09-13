'use strict';

let Q      = require('q');
let denon  = require('./denon.js');
let utils  = require('../common/utils');
let tcp    = require('../common/tcp');
let config = require('../config.json');

denon.init( { host : config.denon.address, port : config.denon.port } );

let message2cmd = {
    'muteoff' : 'MUOFF',
    'muteon'  : 'MUON'
};

tcp
.createServer( config.home.port, callback, errback )
.on('error', function ( err ) { console.log("Error: "+err); } )
.on('connection', function () { console.log('connected'); });
console.log('listening to port '+config.home.port);

function callback ( returnSocket, message ) {
    message = message.trim();
    console.log('sending> '+message+'->'+message2cmd[message]);
    denon.send(message2cmd[message]);
}

function errback ( returnSocket, message, code ) {
    console.log("Problem with message: ("+code+") - "+message);
}


