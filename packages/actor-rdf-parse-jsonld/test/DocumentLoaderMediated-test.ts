import { Readable } from 'node:stream';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { DocumentLoaderMediated } from '../lib/DocumentLoaderMediated';

const DF = new DataFactory();

describe('DocumentLoaderMediated', () => {
  let context: any;
  let mediatorHttp: any;

  beforeEach(() => {
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorHttp = {
      mediate: jest.fn(),
    };
  });

  describe('createFetcher', () => {
    it('should parse valid JSON from response body', async() => {
      const payload = { '@context': { '@vocab': 'http://example.org/' }};
      mediatorHttp.mediate.mockResolvedValueOnce({
        body: Readable.from([ JSON.stringify(payload) ]),
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/ld+json' }),
      });

      const fetcher = (<any> DocumentLoaderMediated).createFetcher(mediatorHttp, context, {});
      const response = await fetcher('http://example.org/context.json', {});
      const result = await response.json();

      expect(result).toEqual(payload);
    });

    it('should throw a descriptive error when response body contains invalid JSON', async() => {
      mediatorHttp.mediate.mockResolvedValueOnce({
        body: Readable.from([ 'not valid json {{{' ]),
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/ld+json' }),
      });

      const fetcher = (<any> DocumentLoaderMediated).createFetcher(mediatorHttp, context, {});
      const response = await fetcher('http://example.org/bad-context.json', {});

      await expect(response.json()).rejects.toThrow(
        'Failed to parse JSON-LD response from http://example.org/bad-context.json:',
      );
    });

    it('should include the JSON parse error message in the thrown error', async() => {
      mediatorHttp.mediate.mockResolvedValueOnce({
        body: Readable.from([ '{invalid' ]),
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/ld+json' }),
      });

      const fetcher = (<any> DocumentLoaderMediated).createFetcher(mediatorHttp, context, {});
      const response = await fetcher('http://example.org/broken.json', {});

      let thrown: Error | undefined;
      try {
        await response.json();
      } catch (error: unknown) {
        thrown = <Error> error;
      }

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown!.message).toContain('Failed to parse JSON-LD response from http://example.org/broken.json:');
    });

    it('should use Request.url when url is a Request object and JSON parse fails', async() => {
      mediatorHttp.mediate.mockResolvedValueOnce({
        body: Readable.from([ 'not json' ]),
        ok: true,
        status: 200,
        headers: new Headers(),
      });

      const fetcher = (<any> DocumentLoaderMediated).createFetcher(mediatorHttp, context, {});
      const request = new Request('http://example.org/request-url.json');
      const response = await fetcher(request, {});

      await expect(response.json()).rejects.toThrow(
        'Failed to parse JSON-LD response from http://example.org/request-url.json:',
      );
    });

    it('should store cache policy when present in response', async() => {
      const lastCachePolicies: Record<string, any> = {};
      const cachePolicyFn = jest.fn().mockReturnValue(true);
      mediatorHttp.mediate.mockResolvedValueOnce({
        body: Readable.from([ '{}' ]),
        ok: true,
        status: 200,
        headers: new Headers(),
        cachePolicy: {
          satisfiesWithoutRevalidation: cachePolicyFn,
        },
      });

      const fetcher = (<any> DocumentLoaderMediated).createFetcher(mediatorHttp, context, lastCachePolicies);
      await fetcher('http://example.org/cached.json', {});

      expect(lastCachePolicies['http://example.org/cached.json']).toBeDefined();
    });
  });
});
