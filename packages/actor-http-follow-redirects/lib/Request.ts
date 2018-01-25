/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/util/Request.js */

import {EventEmitter} from "events";
import {ClientRequest, IncomingMessage} from "http";
import * as url from "url";
import * as zlib from "zlib";

const http = require("follow-redirects").http; // tslint:disable-line no-var-requires
const https = require("follow-redirects").https; // tslint:disable-line no-var-requires

// Try to keep connections open, and set a maximum number of connections per server
const AGENT_SETTINGS = { keepAlive: true, maxSockets: 5 };
const AGENTS = {
  http:  new http.Agent(AGENT_SETTINGS),
  https: new https.Agent(AGENT_SETTINGS),
};

// Decode encoded streams with these decoders
const DECODERS = { gzip: zlib.createGunzip, deflate: zlib.createInflate };

// Creates an HTTP request with the given settings
export function createRequest(settings: any): EventEmitter {
  // Parse the request URL
  if (settings.url) {
    Object.assign(settings, url.parse(settings.url));
  }

  // Emit the response through a proxy
  let request: ClientRequest;
  const requestProxy = new EventEmitter();
  const requester = settings.protocol === 'http:' ? http : https;
  settings.agents = AGENTS;
  request = requester.request(settings, (response: IncomingMessage) => {
    response = decode(response);
    response.setEncoding('utf8');
    // this was removed compared to the original LDF client implementation
    // response.pause(); // exit flow mode
    requestProxy.emit('response', response);
  });
  request.end();
  (<any> requestProxy).abort = () => { request.abort(); };
  return requestProxy;
}

// Returns a decompressed stream from the HTTP response
function decode(response: IncomingMessage): IncomingMessage {
  const encoding = response.headers['content-encoding'];
  if (encoding) {
    if (encoding in DECODERS) {
      // Decode the stream
      const decoded = (<any> DECODERS)[encoding]();
      response.pipe(decoded);
      // Copy response properties
      decoded.statusCode = response.statusCode;
      decoded.headers = response.headers;
      return decoded;
    }
    // Error when no suitable decoder found
    setImmediate(() => {
      response.emit('error', new Error('Unsupported encoding: ' + encoding));
    });
  }
  return response;
}
