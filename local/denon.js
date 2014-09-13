var net = require('net');

var socket    = new net.Socket();
var when      = null;
var host      = null;
var port      = null;
var resTLimit = null;
var queue     = [];
var started   = false;

/**
 * Initialize the host and port
 * @param config {object} The object containing overrides for defaults.
 * @param config.host {string} The host name (ip or url).
 * @param config.port {integer} The port number.
 * @param config.timeout {integer} How long to wait before giving up on a response.
 */
function init ( config ) {
    host      = config.host    || '127.0.0.1';
    port      = config.port    || 23;
    resTLimit = config.timeout || 200;
}

/**
 * Open a connection and start the interval that will pull stuff off of the queue.
 */
function startQueue () {
    if ( started ) return;
    console.log('denon - starting queue');
    socket.connect(port, host);
    started = true;
    
    // set a timeout to cancel the request if it takes too long to connect.
    var cantConnect = setTimeout(function () {
	console.log("denon - Can't connect to the receiver");
	stopQueue();
    }, resTLimit );
    
    // wait for a connect event before procceding.
    // use the 'started' flag so that the interval starts for only the first request.
    socket.on('connect', function () {
	clearTimeout(cantConnect);
	sendNext();
    });
}

function stopQueue () {
    console.log('denon - stopping queue');
    socket.end();
    socket.destroy();
    started = false;
    socket.removeAllListeners();
}

function sendNext () {
    
    // if the queue is empty, close the connection.
    if ( queue.length === 0 ) {
	stopQueue();
	return;
    }
    
    // send the oldest cmd
    var cObj = queue.shift();
    console.log('denon - sending '+cObj.cmd);
    socket.write(cObj.cmd+"\r", "utf-8");
    
    // if there is a callback, wait for it to complete before sending the next cmd.
    if ( cObj.callback ) {
	var fn, takingTooLong;
        
	fn = function () {
	    socket.removeListener('data', fn);
	    clearTimeout(takingTooLong);
	    cObj.callback.apply(cObj.callback, Array.prototype.slice.call(arguments));
	    sendNext();
	}
        
	takingTooLong = setTimeout(
	    function () {
		console.log('denon - took too long to get a response for: '+cObj.cmd);
		socket.removeListener('data', fn );
		sendNext();
	    },
	    cObj.timeout
	);
        
	socket.on('data', fn);
    }
    else {
	sendNext();
    }
}

function send (cmd, callback) {
    if ( typeof(cmd) !== 'object' ) cmd          = { cmd : cmd };
    if ( callback )                 cmd.callback = callback;
    if ( cmd.timeout == null )      cmd.timeout  = resTLimit;
    queue.push(cmd);
    startQueue();
}

function isStarted () { return started; }

module.exports = {
    init    : init,
    send    : send,
    running : isStarted,
};

