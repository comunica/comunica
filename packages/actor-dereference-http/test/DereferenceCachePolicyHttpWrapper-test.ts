import type { IActionHttp } from '@comunica/bus-http';
import { ActionContext } from '@comunica/core';
import type { IActionContext, ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import { DereferenceCachePolicyHttpWrapper } from '../lib/DereferenceCachePolicyHttpWrapper';

describe('DereferenceCachePolicyHttpWrapper', () => {
  let wrapper: DereferenceCachePolicyHttpWrapper;
  let cachePolicy: ICachePolicy<IActionHttp>;
  let context: IActionContext;

  beforeEach(() => {
    cachePolicy = {
      responseHeaders(): Headers {
        return new Headers({ a: 'b' });
      },
      async revalidatedPolicy(
        _revalidationInput: IActionHttp,
        _revalidationResponse: ICacheResponseHead,
      ): Promise<IRevalidationPolicy<IActionHttp>> {
        return {
          matches: true,
          modified: true,
          policy: cachePolicy,
        };
      },
      async revalidationHeaders(_newInput: IActionHttp): Promise<Headers> {
        return new Headers({ c: 'd' });
      },
      async satisfiesWithoutRevalidation(_input: IActionHttp): Promise<boolean> {
        return true;
      },
      storable(): boolean {
        return true;
      },
      timeToLive(): number {
        return 123;
      },
    };
    wrapper = new DereferenceCachePolicyHttpWrapper(cachePolicy, 127);
    context = new ActionContext();
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
      await expect(wrapper.satisfiesWithoutRevalidation({ url: 'http://localhost:8080', context })).resolves.toBeTruthy();
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledTimes(1);
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledWith({
        input: 'http://localhost:8080',
        init: {
          headers: new Headers({ accept: '*/*' }),
        },
        context,
      });
    });

    it('is delegated to the cachePolicy when media types are passed', async() => {
      jest.spyOn(cachePolicy, 'satisfiesWithoutRevalidation');
      await expect(wrapper.satisfiesWithoutRevalidation({
        url: 'http://localhost:8080',
        context,
        async mediaTypes() {
          return { 'text/turtle': 0.9 };
        },
      })).resolves.toBeTruthy();
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledTimes(1);
      expect(cachePolicy.satisfiesWithoutRevalidation).toHaveBeenCalledWith({
        input: 'http://localhost:8080',
        init: {
          headers: new Headers({ accept: 'text/turtle;q=0.9' }),
        },
        context,
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
        url: 'http://localhost:8080',
        context,
        async mediaTypes() {
          return { 'text/turtle': 0.9 };
        },
      })).resolves.toEqual(new Headers({ c: 'd' }));
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledWith({
        input: 'http://localhost:8080',
        init: {
          headers: new Headers({ accept: 'text/turtle;q=0.9' }),
        },
        context,
      });
    });
  });

  describe('revalidatedPolicy', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'revalidatedPolicy');
      await expect(wrapper.revalidatedPolicy({
        url: 'http://localhost:8080',
        context,
        async mediaTypes() {
          return { 'text/turtle': 0.9 };
        },
      }, { status: 200, headers: new Headers({ x: 'y' }) })).resolves.toEqual({
        policy: wrapper,
        modified: true,
        matches: true,
      });
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledWith({
        input: 'http://localhost:8080',
        init: {
          headers: new Headers({ accept: 'text/turtle;q=0.9' }),
        },
        context,
      }, { status: 200, headers: new Headers({ x: 'y' }) });
    });
  });
});
