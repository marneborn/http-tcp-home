var net = require('net');

var HOST = '127.0.0.1';
var PORT = 6969;

// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
var server = net.createServer();

['listening', 'connection', 'close', 'error'].forEach(function (ev) {
    server.on(ev, function () { console.log("Server event: "+ev) });
});

server.on('connection', function(sock) {
    
    ['connect', 'data', 'end', 'timeout', 'drain', 'error', 'close'].forEach(function (ev) {
        sock.on(ev, function () { console.log("Socket event: "+ev) });
    });

    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // Write the data back to the socket, the client will receive it as data from the server
        sock.write('You said "' + data + '"');
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort+"\n");
    });
    
})

//server.listen(PORT, HOST);
server.listen(PORT);

console.log('Server listening on ' + HOST +':'+ PORT);
