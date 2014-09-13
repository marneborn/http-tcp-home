'use strict';

let config  = require('../config.json');

let localDB = {
    "14154073323/muteoff" : { method : "TCP", host : "98.234.105.202", port : config.localPort, message : "muteoff" },
    "14154073323/muteon"  : { method : "TCP", host : "98.234.105.202", port : config.localPort, message : "muteon"  }
};

module.exports.get = function ( lookup ) {

    if ( lookup == null )
        return null;

    if ( localDB[lookup] === undefined )
        return null;

    return localDB[lookup];
}

