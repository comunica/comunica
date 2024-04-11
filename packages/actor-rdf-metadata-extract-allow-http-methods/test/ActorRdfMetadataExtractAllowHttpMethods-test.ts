import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Headers } from 'cross-fetch';
import { ActorRdfMetadataExtractAllowHttpMethods } from '../lib/ActorRdfMetadataExtractAllowHttpMethods';

describe('ActorRdfMetadataExtractAllowHttpMethods', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractAllowHttpMethods instance', () => {
    let actor: ActorRdfMetadataExtractAllowHttpMethods;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractAllowHttpMethods({ name: 'actor', bus });
      input = <any> {};
      context = new ActionContext();
    });

    it('should test', async() => {
      await expect(actor.test({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toBeTruthy();
    });

    it('should run without empty headers', async() => {
      await expect(actor.run({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with empty headers', async() => {
      const headers = new Headers();
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with allow header with one value', async() => {
      const headers = new Headers({ allow: 'abc' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc' ]}});
    });

    it('should run with allow header with multiple values', async() => {
      const headers = new Headers({ allow: 'abc, def,ghi' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc', 'def', 'ghi' ]}});
    });
  });
});
