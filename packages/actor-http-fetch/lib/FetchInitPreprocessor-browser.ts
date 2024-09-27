import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Overrides things for fetch requests in browsers
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  public async handle(init: RequestInit): Promise<RequestInit> {
    // Browsers don't yet support passing ReadableStream as body to requests, see
    // https://bugs.chromium.org/p/chromium/issues/detail?id=688906
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1387483
    // As such, we convert those bodies to a plain string
    // TODO: remove this once browser support ReadableStream in requests
    if (init.body && typeof init.body !== 'string' && 'getReader' in init.body) {
      const reader = init.body.getReader();
      const chunks = [];

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
    return { ...init, keepalive: !init.body };
  }
}
