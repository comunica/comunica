/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module for browsers */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/browser/Request.js */

import {EventEmitter} from 'events';
import {IncomingMessage} from "http";
import * as parseLink from 'parse-link-header';
import {Readable} from "stream";

// Headers we cannot send (see https://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader()-method)
const UNSAFE_REQUEST_HEADERS = {'accept-encoding': true, 'user-agent': true, 'referer': true};

export default class Requester {

  // Resources that were already time-negotiated
  private negotiatedResources: {[id: string]: boolean};

  constructor() {
    this.negotiatedResources = {};
  }

  // Creates an HTTP request with the given settings
  public createRequest(settings: any): EventEmitter {
    // PERFORMANCE HACK:
    // Reduce OPTIONS preflight requests by removing the Accept-Datetime header
    // on requests for resources that are presumed to have been time-negotiated
    if (this.negotiatedResources[this.removeQuery(settings.url)]) {
      delete settings.headers['accept-datetime'];
    }

    // Create the actual XMLHttpRequest
    const request = new XMLHttpRequest();
    const reqHeaders = settings.headers;
    request.open(settings.method, settings.url, true);
    request.timeout = settings.timeout;
    for (const header in reqHeaders) {
      if (!(header in UNSAFE_REQUEST_HEADERS) && reqHeaders[header]) {
        request.setRequestHeader(header, reqHeaders[header]);
      }
    }

    // Create a proxy for the XMLHttpRequest
    const requestProxy = new EventEmitter();
    (<any> requestProxy).abort = () => { request.abort(); };

    // Handle the arrival of a response
    request.onload = () => {
      // Convert the response into an iterator
      const response: IncomingMessage = <IncomingMessage> new Readable();
      response.push(request.responseText || '');
      response.push(null);
      response.statusCode = request.status;
      (<any> response).responseUrl = request.responseURL;

      // Parse the response headers
      response.headers = {};
      const resHeaders = response.headers;
      const rawHeaders = request.getAllResponseHeaders() || '';
      const headerMatcher = /^([^:\n\r]+):[ \t]*([^\r\n]*)$/mg;
      let match = headerMatcher.exec(rawHeaders);
      while (match) {
        resHeaders[match[1].toLowerCase()] = match[2];
        match = headerMatcher.exec(rawHeaders);
      }

      // Emit the response
      requestProxy.emit('response', response);

      // If the resource was time-negotiated, store its queryless URI
      // to enable the PERFORMANCE HACK explained above
      if (reqHeaders['accept-datetime'] && resHeaders['memento-datetime']) {
        const resource = this.removeQuery(resHeaders['content-location'] || settings.url);
        if (!this.negotiatedResources[resource]) {
          // Ensure the resource is not a timegate
          const links = resHeaders.link && parseLink(<string> resHeaders.link);
          const timegate = this.removeQuery(links && links.timegate && links.timegate.url);
          if (resource !== timegate) {
            this.negotiatedResources[resource] = true;
          }
        }
      }
    };
    // Report errors and timeouts
    request.onerror = () => {
      requestProxy.emit('error', new Error('Error requesting ' + settings.url));
    };
    request.ontimeout = () => {
      requestProxy.emit('error', new Error('Timeout requesting ' + settings.url));
    };

    // Execute the request
    request.send();
    return requestProxy;
  }

  // Removes the query string from a URL
  private removeQuery(url: string): string {
    return url ? url.replace(/\?.*$/, '') : '';
  }
}
