'use strict';

let config  = require('../config.json');

let localDB = {
    "14154073323/muteoff" : { method : "TCP", host : config.home.address, port : config.home.port, message : "muteoff" },
    "14154073323/muteon"  : { method : "TCP", host : config.home.address, port : config.home.port, message : "muteon"  }
};

module.exports.get = function ( lookup ) {

    if ( lookup == null )
        return null;

    if ( localDB[lookup] === undefined )
        return null;

    return localDB[lookup];
}

