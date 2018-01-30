#!/usr/bin/env node

import {Bindings} from "@comunica/bus-query-operation";
import {AsyncIterator, IntegerIterator} from "asynciterator";
import * as fs from 'fs';
import * as http from 'http';
import minimist = require('minimist');
import * as querystring from 'querystring';
import * as url from 'url';
import {newEngine, QueryEngine} from '../lib/Query';

const MIME_PLAIN = 'text/plain';
const MIME_JSON  = 'application/json';

const args = minimist(process.argv.slice(2));
if (args._.length !== 1 || args.h || args.help) {
  process.stderr.write(
    'usage: comunica-sparql-http context [-p port] [-t timeout] [--help]\n' +
    '  context should be a JSON object, e.g.\n' +
    '      { "sources": [{ "type": "entrypoint", "value" : "http://fragments.dbpedia.org/2015/en" }]}\n' +
    '  or the path to such a JSON file\n',
  );
  process.exit(1);
}

// allow both files as direct JSON objects for context
const context = JSON.parse(fs.existsSync(args._[0]) ? fs.readFileSync(args._[0], 'utf8') : args._[0]);
const timeout = (parseInt(args.t, 10) || 60) * 1000;
const port = parseInt(args.p, 10) || 3000;

newEngine().then((engine: QueryEngine) => {
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
    let stream: AsyncIterator<Bindings>;
    const promise = engine.query(sparql, context)
      .then((result) => {
        process.stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
        process.stdout.write('      Received query: ' + sparql + '\n');
        response.writeHead(200, { 'content-type': MIME_JSON });

        stream = result.bindingsStream;
        result.bindingsStream.on('data', (data) => {
          response.write(JSON.stringify(data));
        });

        result.bindingsStream.on('end', () => {
          response.end();
        });

      }).catch((error) => {
        process.stdout.write('[400] Bad request\n');
        response.writeHead(400, { 'content-type': MIME_PLAIN });
        response.end(error.toString());
      });

    // Stop after timeout and if the connection is terminated
    // Note: socket or response timeouts seemed unreliable, hence the explicit timeout
    const killTimeout = setTimeout(killClient, timeout);
    response.on('close', killClient);
    function killClient() {
      (<any> promise).cancel();
      if (stream) {
        // remove all listeners so we are sure no more write calls are made
        stream.removeAllListeners();
        stream.close();
      }
      try { response.end(); } catch (e) { /* ignore error */ }
      clearTimeout(killTimeout);
    }
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

});
