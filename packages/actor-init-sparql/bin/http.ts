#!/usr/bin/env node

import {LoggerPretty} from "@comunica/logger-pretty";
import * as fs from 'fs';
import * as http from 'http';
import minimist = require('minimist');
import * as querystring from 'querystring';
import * as url from 'url';
import {newEngineDynamic} from '../index';
import EventEmitter = NodeJS.EventEmitter;
import {ActorInitSparql} from "../lib/ActorInitSparql";

const MIME_PLAIN = 'text/plain';
const MIME_JSON  = 'application/json';

const args = minimist(process.argv.slice(2));
if (args._.length !== 1 || args.h || args.help) {
  process.stderr.write(
    'usage: comunica-sparql-http context [-p port] [-t timeout] [-l log-level] [--help]\n' +
    '  context should be a JSON object, e.g.\n' +
    '      { "sources": [{ "type": "hypermedia", "value" : "http://fragments.dbpedia.org/2015/en" }]}\n' +
    '  or the path to such a JSON file\n',
  );
  process.exit(1);
}

// allow both files as direct JSON objects for context
const context = JSON.parse(fs.existsSync(args._[0]) ? fs.readFileSync(args._[0], 'utf8') : args._[0]);
const timeout = (parseInt(args.t, 10) || 60) * 1000;
const port = parseInt(args.p, 10) || 3000;

// Set the logger
if (!context.log) {
  context.log = new LoggerPretty({ level: args.l || 'warn' });
}

const options = { configResourceUrl: process.env.COMUNICA_CONFIG
  ? process.cwd() + '/' + process.env.COMUNICA_CONFIG : null };
newEngineDynamic(options).then(async (engine: ActorInitSparql) => {
  const mediaTypes: {[id: string]: number} = await engine.getResultMediaTypes(null);
  const variants: any = [];
  for (const type of Object.keys(mediaTypes)) {
    variants.push({ type, quality: mediaTypes[type] });
  }

  // Start the server
  const server = http.createServer(handleRequest);
  server.listen(port);
  server.setTimeout(2 * timeout); // unreliable mechanism, set too high on purpose
  process.stderr.write('Server running on http://localhost:' + port + '/\n');

  // Handles an HTTP request
  function handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    const mediaType: string = request.headers.accept && request.headers.accept !== '*/*'
      ? require('negotiate').choose(variants, request)[0].type : null;

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
      return parseBody(request, (sparql) => { writeQueryResult(request, response, sparql, mediaType); });
    case 'GET':
      return writeQueryResult(request, response,
        <string> (<querystring.ParsedUrlQuery> requestUrl.query).query || '', mediaType);
    default:
      process.stdout.write('[405] ' + request.method + ' to ' + requestUrl + '\n');
      response.writeHead(405, { 'content-type': MIME_JSON });
      response.end(JSON.stringify({ message: 'Incorrect HTTP method' }));
    }
  }

  // Writes the result of the given SPARQL query
  function writeQueryResult(request: http.IncomingMessage, response: http.ServerResponse,
                            sparql: string, mediaType: string) {
    let eventEmitter: EventEmitter;
    const promise = engine.query(sparql, context)
      .then(async (result) => {
        process.stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
        process.stdout.write('      Requested media type: ' + mediaType + '\n');
        process.stdout.write('      Received query: ' + sparql + '\n');
        response.writeHead(200, { 'content-type': mediaType });

        try {
          const data: NodeJS.ReadableStream = (await engine.resultToString(result, mediaType)).data;
          data.on('error', (e: Error) => {
            process.stdout.write('[500] Server error in results: ' + e + ' \n');
            response.end('An internal server error occurred.\n');
          });
          data.pipe(response);
          eventEmitter = data;
        } catch (error) {
          process.stdout.write('[400] Bad request, invalid media type\n');
          response.writeHead(400, { 'content-type': MIME_PLAIN });
          response.end('The response for the given query could not be serialized for the requested media type\n');
        }
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
      if (eventEmitter) {
        // remove all listeners so we are sure no more write calls are made
        eventEmitter.removeAllListeners();
        eventEmitter.emit('end');
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
      const contentType: string = request.headers['content-type'];
      if (contentType.indexOf('application/sparql-query') >= 0) {
        return callback(body);
      } else if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
        return callback(<string> querystring.parse(body).query || '');
      } else {
        return callback(body);
      }
    });
  }

}).catch(console.error);
