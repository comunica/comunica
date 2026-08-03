import { ActionContext } from '@comunica/core';
import type { IActionContext, ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import type { IActionDereference } from '../lib';
import { DereferenceRdfCachePolicyDereferenceWrapper } from '../lib/DereferenceRdfCachePolicyDereferenceWrapper';

describe('DereferenceRdfCachePolicyDereferenceWrapper', () => {
  let mediaTypes: () => Promise<Record<string, number> | undefined>;
  let wrapper: DereferenceRdfCachePolicyDereferenceWrapper;
  let cachePolicy: ICachePolicy<IActionDereference>;
  let context: IActionContext;

  beforeEach(() => {
    mediaTypes = async() => {
      return { 'text/turtle': 0.9 };
    };
    cachePolicy = {
      responseHeaders(): Headers {
        return new Headers({ a: 'b' });
      },
      async revalidatedPolicy(
        _revalidationInput: IActionDereference,
        _revalidationResponse: ICacheResponseHead,
      ): Promise<IRevalidationPolicy<IActionDereference>> {
        return {
          matches: true,
          modified: true,
          policy: cachePolicy,
        };
      },
      async revalidationHeaders(_newInput: IActionDereference): Promise<Headers> {
        return new Headers({ c: 'd' });
      },
      async satisfiesWithoutRevalidation(_input: IActionDereference): Promise<boolean> {
        return true;
      },
      storable(): boolean {
        return true;
      },
      timeToLive(): number {
        return 123;
      },
    };
    wrapper = new DereferenceRdfCachePolicyDereferenceWrapper(cachePolicy, mediaTypes);
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
        url: 'http://localhost:8080',
        context,
        mediaTypes,
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
      })).resolves.toEqual(new Headers({ c: 'd' }));
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidationHeaders).toHaveBeenCalledWith({
        url: 'http://localhost:8080',
        context,
        mediaTypes,
      });
    });
  });

  describe('revalidatedPolicy', () => {
    it('is delegated to the cachePolicy', async() => {
      jest.spyOn(cachePolicy, 'revalidatedPolicy');
      await expect(wrapper.revalidatedPolicy({
        url: 'http://localhost:8080',
        context,
      }, { status: 200, headers: new Headers({ x: 'y' }) })).resolves.toEqual({
        policy: cachePolicy,
        modified: true,
        matches: true,
      });
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledTimes(1);
      expect(cachePolicy.revalidatedPolicy).toHaveBeenCalledWith({
        url: 'http://localhost:8080',
        context,
        mediaTypes,
      }, { status: 200, headers: new Headers({ x: 'y' }) });
    });
  });
});
