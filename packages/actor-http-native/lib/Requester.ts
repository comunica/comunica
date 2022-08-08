/* ! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/util/Request.js */

import { EventEmitter } from 'events';
import type { AgentOptions, ClientRequest, IncomingMessage, IncomingHttpHeaders } from 'http';
import * as url from 'url';
import * as zlib from 'zlib';
import 'cross-fetch/polyfill';
import { ActorHttp } from '@comunica/bus-http';

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
      settings = { ...url.parse(settings.url), ...settings };
    }

    // Emit the response through a proxy
    const requestProxy = new EventEmitter();
    const requester = settings.protocol === 'http:' ? http : https;
    settings.agents = this.agents;

    // Unpacking headers object into a plain object
    const headersObject: any = {};
    if (settings.headers) {
      (<Headers> settings.headers).forEach((value, key) => {
        headersObject[key] = value;
      });
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
    if (settings.body) {
      if (settings.body instanceof URLSearchParams) {
        request.write(settings.body.toString());
        request.end();
      } else if (typeof settings.body === 'string') {
        request.write(settings.body);
        request.end();
      } else {
        ActorHttp.toNodeReadable(settings.body).pipe(request);
      }
    } else {
      request.end();
    }
    return requestProxy;
  }

  // Wrap headers into an header object type
  public convertRequestHeadersToFetchHeaders(headers: IncomingHttpHeaders): Headers {
    const responseHeaders: Headers = new Headers();
    for (const key in headers) {
      responseHeaders.append(key, <string> headers[key]);
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
        decoded.headers = this.convertRequestHeadersToFetchHeaders(response.headers);
        return decoded;
      }
      // Error when no suitable decoder found
      setTimeout(() => {
        response.emit('error', new Error(`Unsupported encoding: ${encoding}`));
      });
    }

    response.headers = <any> this.convertRequestHeadersToFetchHeaders(response.headers);
    return response;
  }
}
