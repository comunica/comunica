/*! @license MIT ©2013-2018 Ruben Verborgh, Ghent University - imec */
/* Single-function HTTP(S) request module for browsers */
/* Translated from https://github.com/LinkedDataFragments/Client.js/blob/master/lib/browser/Request.js */

import {EventEmitter} from 'events';
import {IncomingMessage} from "http";
import * as parseLink from 'parse-link-header';
import {Readable} from "stream";

export default class Requester {
  // Resources that were already time-negotiated
  private negotiatedResources = new Set<string>();

  // Creates an HTTP request with the given settings
  public createRequest({ url, headers, method, timeout }: {
    url: string,
    headers: {[id: string]: string},
    method: string,
    timeout: number,
  }): EventEmitter {
    // PERFORMANCE HACK:
    // Reduce OPTIONS preflight requests by removing the Accept-Datetime header
    // on requests for resources that are presumed to have been time-negotiated
    if (this.negotiatedResources.has(this.removeQuery(url))) {
      delete headers['accept-datetime'];
    }

    // Create the actual request
    const reqController = new AbortController();
    const signal = reqController.signal;
    const request = fetch(url, { headers, method, signal });
    if (timeout) {
      setTimeout(() => reqController.abort(), timeout);
    }

    // Create a proxy for the request
    const requestProxy = new EventEmitter();
    (<any> requestProxy).abort = () => reqController.abort();

    // Handle the arrival of a response
    request.then(async (response) => {
      // Convert the response into a stream
      const responseProxy: IncomingMessage = <IncomingMessage> new Readable();
      responseProxy.push(await response.text());
      responseProxy.push(null);
      responseProxy.statusCode = response.status;
      (<any> responseProxy).responseUrl = response.url;

      // Parse the response headers
      const resHeaders: {[id: string]: string} = {};
      responseProxy.headers = resHeaders;
      for (const [name, value] of (<any> response.headers).entries()) {
        resHeaders[name.toLowerCase()] = value;
      }

      // Emit the response
      requestProxy.emit('response', responseProxy);

      // If the resource was time-negotiated, store its queryless URI
      // to enable the PERFORMANCE HACK explained above
      if (headers['accept-datetime'] && resHeaders['memento-datetime']) {
        const resource = this.removeQuery(resHeaders['content-location'] || url);
        if (!this.negotiatedResources.has(resource)) {
          // Ensure the resource is not a timegate
          const links = resHeaders.link && parseLink(resHeaders.link);
          const timegate = this.removeQuery(links && links.timegate && links.timegate.url);
          if (resource !== timegate) {
            this.negotiatedResources.add(resource);
          }
        }
      }
    })
    .catch((error) => requestProxy.emit('error', error));
    return requestProxy;
  }

  // Removes the query string from a URL
  private removeQuery(url: string): string {
    return url ? url.replace(/\?.*$/, '') : '';
  }
}
