/* ! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/util/Request.js */

import { EventEmitter } from 'events';
import { AgentOptions, ClientRequest, IncomingMessage } from 'http';
import * as url from 'url';
import * as zlib from 'zlib';

const { http } = require('follow-redirects');
const { https } = require('follow-redirects');

// Decode encoded streams with these decoders
const DECODERS = { gzip: zlib.createGunzip, deflate: zlib.createInflate };

export default class Requester {
  private readonly agents: any;

  public constructor(agentOptions?: AgentOptions) {
    this.agents = {
      http: new http.Agent(agentOptions ?? {}),
      https: new https.Agent(agentOptions ?? {}),
    };
  }

  // Creates an HTTP request with the given settings
  public createRequest(settings: any): EventEmitter {
    // Parse the request URL
    if (settings.url) {
      Object.assign(settings, url.parse(settings.url));
    }

    // Emit the response through a proxy
    const requestProxy = new EventEmitter();
    const requester = settings.protocol === 'http:' ? http : https;
    settings.agents = this.agents;

    // Unpacking headers object into a plain object
    const headersObject: any = {};
    if (settings.headers && settings.headers._headers) {
      for (const header in settings.headers._headers) {
        headersObject[header] = settings.headers._headers[header];
      }
    } else if (settings.headers) {
      for (const [ header, val ] of settings.headers.entries()) {
        headersObject[header] = val;
      }
    }
    settings.headers = headersObject;

    const request: ClientRequest = requester.request(settings, (response: IncomingMessage) => {
      response = this.decode(response);
      settings.headers = response.headers;
      response.setEncoding('utf8');
      // This was removed compared to the original LDF client implementation
      // response.pause(); // exit flow mode
      requestProxy.emit('response', response);
    });
    request.on('error', error => requestProxy.emit('error', error));
    request.end();
    return requestProxy;
  }

  // Wrap headers into an header object type
  public convertFetchHeadersToHash(response: any): any {
    const responseHeaders: Headers = new Headers();
    if (response.input && response.input.headers) {
      for (const header in response.input.headers) {
        responseHeaders.append(header, response.input.headers[header]);
      }
    }
    for (const header in response.headers) {
      responseHeaders.append(header, response.headers[header]);
    }
    return responseHeaders;
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
        decoded.headers = this.convertFetchHeadersToHash(response);
        return decoded;
      }
      // Error when no suitable decoder found
      setImmediate(() => {
        response.emit('error', new Error(`Unsupported encoding: ${encoding}`));
      });
    }

    response.headers = this.convertFetchHeadersToHash(response);
    return response;
  }
}
