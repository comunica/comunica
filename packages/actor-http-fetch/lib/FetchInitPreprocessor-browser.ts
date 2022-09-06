/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */

import { ActorHttp } from '@comunica/bus-http';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Overrides things for fetch requests in browsers
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  public async handle(init: RequestInit): Promise<RequestInit> {
    // Remove overridden user-agent header within browsers to avoid CORS issues
    if (init.headers) {
      const headers = new Headers(init.headers);
      if (headers.has('user-agent')) {
        headers.delete('user-agent');
      }
      init.headers = headers;
    }

    // TODO: remove this workaround once this has a fix: https://github.com/inrupt/solid-client-authn-js/issues/1708
    if (init?.headers && 'append' in init.headers) {
      init.headers = ActorHttp.headersToHash(init.headers);
    }

    // Browsers don't yet support passing ReadableStream as body to requests, see
    // https://bugs.chromium.org/p/chromium/issues/detail?id=688906
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1387483
    // As such, we convert those bodies to a plain string
    // TODO: remove this once browser support ReadableStream in requests
    if (init.body && typeof init.body !== 'string' && 'getReader' in init.body) {
      const reader = init.body.getReader();
      const chunks = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
      }
      init.body = chunks.join('');
    }

    // Only enable keepalive functionality if we are not sending a body (some browsers seem to trip over this)
    return { keepalive: !init.body, ...init };
  }

  public async createAbortController(): Promise<AbortController> {
    return new AbortController();
  }
}
