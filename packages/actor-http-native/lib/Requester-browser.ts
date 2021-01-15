/* eslint-disable unicorn/filename-case */
/* ! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module for browsers */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/browser/Request.js */

import { EventEmitter } from 'events';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Readable } from 'stream';
import * as parseLink from 'parse-link-header';

// Headers we cannot send (see https://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader()-method)
const UNSAFE_REQUEST_HEADERS = { 'accept-encoding': true, 'user-agent': true, referer: true };

export default class Requester {
  // Resources that were already time-negotiated
  private negotiatedResources: Record<string, boolean>;

  public constructor() {
    this.negotiatedResources = {};
  }

  // Creates an HTTP request with the given settings
  public createRequest(settings: any): EventEmitter {
    // PERFORMANCE HACK:
    // Reduce OPTIONS preflight requests by removing the Accept-Datetime header
    // on requests for resources that are presumed to have been time-negotiated
    if (this.negotiatedResources[this.removeQuery(settings.url)]) {
      (<Headers> settings.headers).delete('accept-datetime');
    }

    // Create the actual XMLHttpRequest
    const request = new XMLHttpRequest();
    const reqHeaders: Headers = settings.headers;
    request.open(settings.method, settings.url, true);
    request.timeout = settings.timeout;
    request.withCredentials = settings.withCredentials;

    reqHeaders.forEach((value, key) => {
      if (!(key in UNSAFE_REQUEST_HEADERS) && value) {
        request.setRequestHeader(key, value);
      }
    });

    // Create a proxy for the XMLHttpRequest
    const requestProxy = new EventEmitter();
    (<any> requestProxy).abort = () => {
      request.abort();
    };

    // Handle the arrival of a response
    request.onload = () => {
      // Convert the response into an iterator
      const response: IncomingMessage = <IncomingMessage> new Readable();
      response.push(request.responseText || '');
      response.push(null);
      response.statusCode = request.status;
      (<any> response).responseUrl = request.responseURL;

      // Parse the response headers
      const resHeaders: Headers = this.convertRequestHeadersToFetchHeaders(response.headers);
      response.headers = <any> resHeaders;
      const rawHeaders = request.getAllResponseHeaders() || '';
      const headerMatcher = /^([^\n\r:]+):[\t ]*([^\n\r]*)$/gmu;
      let match = headerMatcher.exec(rawHeaders);
      while (match) {
        resHeaders.set(match[1].toLowerCase(), match[2]);
        match = headerMatcher.exec(rawHeaders);
      }

      // Emit the response
      requestProxy.emit('response', response);

      // If the resource was time-negotiated, store its queryless URI
      // to enable the PERFORMANCE HACK explained above
      if (reqHeaders.has('accept-datetime') && resHeaders.has('memento-datetime')) {
        const resource = this.removeQuery(resHeaders.get('content-location') ?? settings.url);
        if (!this.negotiatedResources[resource]) {
          // Ensure the resource is not a timegate
          const links = (resHeaders.get('link') && parseLink(resHeaders.get('link')!)) ?? undefined;
          const timegate = this.removeQuery(links && links.timegate && links.timegate.url);
          if (resource !== timegate) {
            this.negotiatedResources[resource] = true;
          }
        }
      }
    };
    // Report errors and timeouts
    request.onerror = () => {
      requestProxy.emit('error', new Error(`Error requesting ${settings.url}`));
    };
    request.ontimeout = () => {
      requestProxy.emit('error', new Error(`Timeout requesting ${settings.url}`));
    };

    // Execute the request
    request.send();
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

  // Removes the query string from a URL
  private removeQuery(url?: string): string {
    return url ? url.replace(/\?.*$/u, '') : '';
  }
}
