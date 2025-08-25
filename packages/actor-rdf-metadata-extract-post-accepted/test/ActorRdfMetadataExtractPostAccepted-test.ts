import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractPostAccepted } from '../lib/ActorRdfMetadataExtractPostAccepted';
import '@comunica/utils-jest';

describe('ActorRdfMetadataExtractPostAccepted', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractPostAccepted instance', () => {
    let actor: ActorRdfMetadataExtractPostAccepted;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractPostAccepted({ name: 'actor', bus });
      input = <any>{};
      context = new ActionContext();
    });

    it('should test', async() => {
      await expect(actor.test({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toPassTestVoid();
    });

    it('should run without empty headers', async() => {
      await expect(actor.run({ url: 'http://example.org/', metadata: input, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with empty headers', async() => {
      const headers = new Headers({});
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with accept-post header with one value', async() => {
      const headers = new Headers({ 'accept-post': 'abc' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { postAccepted: [ 'abc' ]}});
    });

    it('should run with accept-post header with multiple values', async() => {
      const headers = new Headers({ 'accept-post': 'abc, def,ghi' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { postAccepted: [ 'abc', 'def', 'ghi' ]}});
    });
  });
});
