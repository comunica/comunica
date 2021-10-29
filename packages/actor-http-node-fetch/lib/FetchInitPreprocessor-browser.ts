/* eslint-disable unicorn/filename-case */
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Does nothing in browsers
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  public handle(init: RequestInit): RequestInit {
    // Remove overridden user-agent header within browsers to avoid CORS issues
    if (init.headers) {
      const headers = new Headers(init.headers);
      if (headers.has('user-agent')) {
        headers.delete('user-agent');
      }
      init.headers = headers;
    }

    return { keepalive: true, ...init };
  }
}
