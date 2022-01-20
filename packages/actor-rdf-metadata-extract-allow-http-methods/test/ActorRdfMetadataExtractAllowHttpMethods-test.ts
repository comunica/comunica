import type { Readable } from 'stream';
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

    it('should test', () => {
      return expect(actor.test({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toBeTruthy();
    });

    it('should run without empty headers', () => {
      return expect(actor.run({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with empty headers', () => {
      const headers = new Headers();
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with allow header with one value', () => {
      const headers = new Headers({ allow: 'abc' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc' ]}});
    });

    it('should run with allow header with multiple values', () => {
      const headers = new Headers({ allow: 'abc, def,ghi' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc', 'def', 'ghi' ]}});
    });
  });
});
