'use strict';

let Q      = require('q');
let fs     = require('fs');
let denon  = require('./denon.js');
let utils  = require('../common/utils');
let tcp    = require('../common/tcp');
let config = require('../config.json');

denon.init( { host : config.denonIP, port : config.denonPort } );

let message2cmd = {
    'muteoff' : 'MUOFF',
    'muteon'  : 'MUON'
};

tcp.createServer( config.localPort, callback, errback )
.on('connection', function ( socket ) {
    console.log('connected to: '+socket.remoteAddress+':'+socket.remotePort);
})
console.log('listening to port '+config.localPort);

function callback ( message ) {
    message = message.trim();
    denon.send(message2cmd[message]);
}

function errback ( message, code ) {
    console.log("Problem with message: ("+code+") - "+message);
}


