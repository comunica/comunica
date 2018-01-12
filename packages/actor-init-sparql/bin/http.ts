#!/usr/bin/env node

import * as http from 'http';
import minimist = require('minimist');
import * as querystring from 'querystring';
import * as url from 'url';
import {query} from '../lib/Query';

const MIME_PLAIN = 'text/plain';
const MIME_JSON  = 'application/json';

const args = minimist(process.argv.slice(2));
if (!args._.length || args.h || args.help) {
  process.stderr.write(
    'usage: ldf-client-http startFragment1 [startFragment2 ...] [-p port] [-t timeout] [--help]\n',
  );
  process.exit(1);
}

const startFragments = args._;
const timeout = (parseInt(args.t, 10) || 60) * 1000;
const port = parseInt(args.p, 10) || 3000;

// Start the server
const server = http.createServer(handleRequest);
server.listen(port);
server.setTimeout(2 * timeout); // unreliable mechanism, set too high on purpose
process.stderr.write('Server running on http://localhost:' + port + '/\n');

// Handles an HTTP request
function handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
  // Verify the path
  const requestUrl = url.parse(request.url, true);
  if (requestUrl.pathname !== '/sparql') {
    process.stdout.write('[404] Resource not found\n');
    response.writeHead(404, { 'content-type': MIME_JSON });
    response.end(JSON.stringify({ message: 'Resource not found' }));
    return;
  }

  // Parse the query, depending on the HTTP method
  switch (request.method) {
  case 'POST':
    return parseBody(request, (sparql) => { writeQueryResult(request, response, sparql); });
  case 'GET':
    return writeQueryResult(request, response, <string> (<querystring.ParsedUrlQuery> requestUrl.query).query || '');
  default:
    process.stdout.write('[405] ' + request.method + ' to ' + requestUrl + '\n');
    response.writeHead(405, { 'content-type': MIME_JSON });
    response.end(JSON.stringify({ message: 'Incorrect HTTP method' }));
  }
}

// Writes the result of the given SPARQL query
function writeQueryResult(request: http.IncomingMessage, response: http.ServerResponse, sparql: string) {
  query(sparql,
    { entrypoint: startFragments[0] })
    .then((result) => {
      process.stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
      process.stdout.write('      Received query: ' + sparql + '\n');
      response.writeHead(200, { 'content-type': MIME_JSON });

      result.bindingsStream.on('data', (data) => {
        response.write(JSON.stringify(data));
      });

      result.bindingsStream.on('end', () => {
        response.end();
      });

    }).catch((error) => {
      process.stdout.write('[400] Bad request\n');
      response.writeHead(400, { 'content-type': MIME_PLAIN });
      response.end(JSON.stringify(error));
    });
}

// Parses the body of a SPARQL POST request
function parseBody(request: http.IncomingMessage, callback: (sparql: string) => void) {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    switch (request.headers['content-type']) {
    case 'application/sparql-query':
      return callback(body);
    case 'application/x-www-form-urlencoded':
      return callback(<string> querystring.parse(body).query || '');
    default:
      return callback(body);
    }
  });
}
