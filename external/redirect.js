'use strict';

let Q      = require('q');
let http   = require('http');
let url    = require('url');
let utils  = require('../common/utils');
let tcp    = require('../common/tcp');
let config = require('../config.json');
let cmdDB  = require('./commandDB');

const R = module.exports.R = {
    OK       :  0,
    NOK      :  1,
    BAD_PATH :  2,
};

console.log("Starting...");

let port   = Number(process.env.PORT || config.localHerokuPort);
let server = http
        .createServer()
        .on('request'  , handleRequest )
        .on('listening', function ()      { console.log("Listening to port: "+port); })
        .on('error'    , function ( err ) { console.log("Error event seen: "+err); })
        .listen(port);

function handleRequest ( request, response ) {

    console.log("request from: "+request.connection.remoteAddress+':'+request.connection.remotePort+' - '+request.url);
    let routeStr = url.parse (request.url).pathname;
    let route    = parseRoute  (routeStr);
    let command  = cmdDB.get(route.path);

    // if there is no command associated with that route,
    // close the connection and return a rejected promise
    if ( command === null ) {
        return respond404(route, response, []);
    }

    // Basic status to report back to the requestor
    let status = [
        "Requester: " + request.connection.remoteAddress+":"+request.connection.remotePort,
        "URL: "       + request.url,
        "Route: "     + JSON.stringify(route),
        "Command: "   + JSON.stringify(command)
    ];

    return redirect( request, route, command )
        .then (
            function ( msgs ) { return           respond (route, response, status.concat(msgs)) ; },
            function ( msgs ) { return Q.reject (respond (route, response, status.concat(msgs))); }
        );
}

function parseRoute ( routeStr ) {

    let route = {
        orig    : routeStr,
        returnA : null,
        path    : null,
        query   : null
    };

    // strip the leading slash (always there right?)
    routeStr = routeStr.substring(1);

    if ( routeStr === '' || routeStr === 'favicon.ico' ) {
        return route;
    }

    // if the string starts with 'getlogfile/' strip that off and set return a file.
    // find the first slash
    let slash = routeStr.indexOf('/');
    if ( slash < 0 ) slash = routeStr.length;
    if ( routeStr.substring(0,slash) === 'getlogfile' ) {
        route.returnA = 'attach';
        routeStr = routeStr.substring(slash+1);
    }

    // if there is a query, extract it to send it on
    let qst = routeStr.indexOf('?');
    if ( qst > 0 ) {
        route.query = routeStr.substring(qst+1);
        routeStr    = routeStr.substring(0,qst);
    }

    // default is to return an html file
    if ( route.returnA === null )
        route.returnA = 'html';

    // whatever is left is the thing to lookup in the DB.
    route.path = routeStr;

    return route;
}

let redirectFuncs = [redirectTCP];
function redirect ( request, route, command ) {
    for ( let i=0; i<redirectFuncs.length; i++ ) {
        let func  = redirectFuncs[i];
        let reply = func( request, route, command );
        if ( reply !== null )
            return reply;
    }
    return Q.reject("No valid method found to handle this request");
}

function redirectTCP ( request, route, command ) {

    if ( command.method !== "TCP" )
        return null;

    var message = command.message;

    if ( route.query !== null )
        message += "?" + route.query;

    return tcp.send(command.port, command.host, message);//, { timeout : 500 } );
}

var respondFuncs = [respondAttach, respondHtml];
function respond ( route, response, status ) {
    for ( let i=0; i<respondFuncs.length; i++ ) {
        let func  = respondFuncs[i];
        let reply = func( route, response, status );
        if ( reply !== null )
            return reply;
    }
    return Q.reject(R.NOK);
}

function respondAttach ( route, response, status ) {

    if ( route.returnA !== "attach" )
        return null;

    var filename = "redirect.log";
    response.writeHead(200, {
        'Content-Type'        : 'text/plain',
        'Content-Disposition' : 'attachment; filename="'+filename+'"'
    });

    response.end( status.join("\n") );

    return Q.resolve(R.OK);
}


function respondHtml ( route, response, status ) {

    response.writeHead(200, {
        'Content-Type'        : 'text/html',
    });
    response.write("<html>");
    response.write("<head></head>");
    response.write("<body>");
    for ( var i=0; i<status.length; i++ ) {
        response.write("<p>"+status[i]+"</p>");
    }
    response.write("</body></html>");
    response.end();

    return Q.resolve(R.OK);
}

function respond404 ( route, response, status ) {

    response.writeHead(404, {
        'Content-Type'        : 'text/html',
    });

    response.write('<html>');
    response.write('<head>');
    response.write('<title>404 Not Found</title>');
    response.write('</head>');
    response.write('<body>');
    response.write('<h1>Not Found</h1>');
    response.write('<p>The requested URL '+route.orig+' was not found on this server.</p>');
    response.write('<p>Additionally, a 404 Not Found error was encountered while trying to use an ErrorDocument to handle the request.</p>');
    response.write('</body></html>');
    response.end();

    return Q.reject(R.NOK);
}
