/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/util/Request.js */

import {EventEmitter} from "events";
import {AgentOptions, ClientRequest, IncomingMessage} from "http";
import * as url from "url";
import * as zlib from "zlib";

const http = require("follow-redirects").http; // tslint:disable-line no-var-requires
const https = require("follow-redirects").https; // tslint:disable-line no-var-requires

// Decode encoded streams with these decoders
const DECODERS = {gzip: zlib.createGunzip, deflate: zlib.createInflate};

export default class Requester {
  private agents: any;

  constructor(agentOptions?: AgentOptions) {
    this.agents = {
      http: new http.Agent(agentOptions || {}),
      https: new https.Agent(agentOptions || {}),
    };
  }

  // Creates an HTTP request with the given settings
  public createRequest(settings: any): EventEmitter {
    // Parse the request URL
    if (settings.url) {
      Object.assign(settings, url.parse(settings.url));
    }

    // Emit the response through a proxy
    let request: ClientRequest;
    const requestProxy = new EventEmitter();
    const requester = settings.protocol === 'http:' ? http : https;
    settings.agents = this.agents;
    request = requester.request(settings, (response: IncomingMessage) => {
      response = this.decode(response);
      response.setEncoding('utf8');
      // this was removed compared to the original LDF client implementation
      // response.pause(); // exit flow mode
      requestProxy.emit('response', response);
    });
    request.on('error', (error) => requestProxy.emit('error', error));
    request.end();
    return requestProxy;
  }

  // Returns a decompressed stream from the HTTP response
  private decode(response: IncomingMessage): IncomingMessage {
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
}
