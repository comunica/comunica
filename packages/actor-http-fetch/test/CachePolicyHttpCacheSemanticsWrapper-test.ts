import { ActionContext } from '@comunica/core';
import CachePolicy = require('http-cache-semantics');
import { CachePolicyHttpCacheSemanticsWrapper } from '../lib/CachePolicyHttpCacheSemanticsWrapper';
import { FetchInitPreprocessor } from '../lib/FetchInitPreprocessor';

describe('CachePolicyHttpCacheSemanticsWrapper', () => {
  let wrapper: CachePolicyHttpCacheSemanticsWrapper;
  let cachePolicy: CachePolicy;

  beforeEach(() => {
    cachePolicy = {
      toObject(): CachePolicy.CachePolicyObject {
        throw new Error('Method toObject not implemented.');
      },
      responseHeaders(): CachePolicy.Headers {
        return { a: 'b' };
      },
      revalidatedPolicy(
        _revalidationInput: CachePolicy.Request,
        _revalidationResponse: CachePolicy.Response,
      ): CachePolicy.RevalidationPolicy {
        return {
          matches: true,
          modified: true,
          policy: cachePolicy,
        };
      },
      revalidationHeaders(_newInput: CachePolicy.Request): CachePolicy.Headers {
        return { c: 'd' };
      },
      satisfiesWithoutRevalidation(_input: CachePolicy.Request): boolean {
        return true;
      },
      storable(): boolean {
        return true;
      },
      timeToLive(): number {
        return 123;
      },
    };
    wrapper = new CachePolicyHttpCacheSemanticsWrapper(cachePolicy, 123, new FetchInitPreprocessor({
      name: 'abc',
      bus: <any> undefined,
      cacheMaxSize: 104857600,
      cacheMaxCount: 1000,
      cacheMaxEntrySize: 5242880,
      agentOptions: {},
      httpInvalidator: <any> {
        addInvalidateListener: jest.fn(),
      },
    }));
  });

  describe('storable', () => {
    it('is delegated to the cachePolicy', () => {
      jest.spyOn(cachePolicy, 'storable');
      expect(wrapper.storable()).toBeTruthy();
      expect(cachePolicy.storable).toHaveBeenCalledTimes(1);
    });
  });

  describe('satisfiesWithoutRevalidation', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'satisfiesWithoutRevalidation');
      await expect(wrapper.satisfiesWithoutRevalidation({
        input: 'http://localhost:8080/',
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext(),
      })).resolves.toBeTruthy();
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledTimes(1);
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      });
    });

    it('is delegated to the cachePolicy with input request', async() => {
      jest.spyOn(cachePolicy, 'satisfiesWithoutRevalidation');
      await expect(wrapper.satisfiesWithoutRevalidation({
        input: new Request('http://localhost:8080/', { headers: new Headers({ a: 'b' }) }),
        context: new ActionContext(),
      })).resolves.toBeTruthy();
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledTimes(1);
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      });
    });

    it('is delegated to the cachePolicy when media types are passed', async() => {
      jest.spyOn(cachePolicy, 'satisfiesWithoutRevalidation');
      await expect(wrapper.satisfiesWithoutRevalidation({
        input: 'http://localhost:8080/',
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext(),
      })).resolves.toBeTruthy();
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledTimes(1);
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      });
    });
  });

  describe('responseHeaders', () => {
    it('is delegated to the cachePolicy', () => {
      jest.spyOn(cachePolicy, 'responseHeaders');
      expect(wrapper.responseHeaders()).toEqual(new Headers({ a: 'b' }));
      expect(cachePolicy.responseHeaders).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeToLive', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'timeToLive');
      expect(wrapper.timeToLive()).toBe(123);
      expect(cachePolicy.timeToLive).toHaveBeenCalledTimes(1);
    });
  });

  describe('revalidationHeaders', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'revalidationHeaders');
      await expect(wrapper.revalidationHeaders({
        input: 'http://localhost:8080/',
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext(),
      })).resolves.toEqual(new Headers({ c: 'd' }));
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      });
    });
  });

  describe('revalidatedPolicy', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'revalidatedPolicy');
      await expect(wrapper.revalidatedPolicy({
        input: 'http://localhost:8080/',
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext(),
      }, { status: 200, headers: new Headers({ x: 'y' }) })).resolves.toEqual({
        policy: wrapper,
        modified: true,
        matches: true,
      });
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      }, { status: 200, headers: { x: 'y' }});
    });

    it('is delegated to the cachePolicy without revalidationResponse headers', async() => {
      jest.spyOn(cachePolicy, 'revalidatedPolicy');
      await expect(wrapper.revalidatedPolicy({
        input: 'http://localhost:8080/',
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext(),
      }, { status: 200 })).resolves.toEqual({
        policy: wrapper,
        modified: true,
        matches: true,
      });
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledWith({
        url: 'http://localhost:8080/',
        method: 'GET',
        headers: { a: 'b', 'accept-encoding': 'br,gzip,deflate' },
      }, { status: 200, headers: {}});
    });
  });

  describe('convertToFetchHeaders', () => {
    it('converts single and multiple elements', async() => {
      const expectedHeaders = new Headers({ a: '1', b: '2' });
      expectedHeaders.append('b', '3');
      expect(CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders({
        a: '1',
        b: [ '2', '3' ],
        c: undefined,
      })).toEqual(expectedHeaders);
    });
  });
});
