import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { FetchInitPreprocessor } from '../lib/FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from '../lib/IFetchInitPreprocessor';

describe('FetchInitPreprocessor', () => {
  let preprocessor: IFetchInitPreprocessor;
  let originalController: any;
  let defaultHeaders: Headers;

  beforeEach(() => {
    preprocessor = new FetchInitPreprocessor({});
    originalController = globalThis.AbortController;
    defaultHeaders = new Headers({ 'accept-encoding': 'br,gzip,deflate' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
    globalThis.AbortController = originalController;
  });

  describe('handle', () => {
    it('should handle init without body', async() => {
      await expect(preprocessor.handle({})).resolves.toStrictEqual({
        agent: expect.any(Function),
        headers: defaultHeaders,
        keepalive: true,
      });
    });

    it('should handle init with body', async() => {
      const body = new ReadableStream({
        async pull(controller) {
          controller.enqueue('abc');
          controller.close();
        },
      });
      await expect(preprocessor.handle({ body })).resolves.toStrictEqual({
        agent: expect.any(Function),
        body: expect.any(ReadableStream),
        duplex: 'half',
        headers: defaultHeaders,
        keepalive: false,
      });
    });

    it('should not modify existing Accept-Encoding header', async() => {
      const customHeaders = new Headers({ 'accept-encoding': 'br' });
      await expect(preprocessor.handle({ headers: customHeaders })).resolves.toStrictEqual({
        agent: expect.any(Function),
        headers: customHeaders,
        keepalive: true,
      });
    });

    it('should provide agents for http and https', async() => {
      expect((<any>preprocessor).agent(new URL('http://example.org/'))).toBeInstanceOf(HttpAgent);
      expect((<any>preprocessor).agent(new URL('https://example.org/'))).toBeInstanceOf(HttpsAgent);
    });
  });
});
