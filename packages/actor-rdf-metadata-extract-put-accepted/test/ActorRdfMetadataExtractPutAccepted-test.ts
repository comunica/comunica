import type { Readable } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Headers } from 'cross-fetch';
import { ActorRdfMetadataExtractPutAccepted } from '../lib/ActorRdfMetadataExtractPutAccepted';

describe('ActorRdfMetadataExtractPostAccepted', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractPutAccepted instance', () => {
    let actor: ActorRdfMetadataExtractPutAccepted;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractPutAccepted({ name: 'actor', bus });
      input = <any>{};
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
      const headers = new Headers({});
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with accept-put header with one value', () => {
      const headers = new Headers({ 'accept-put': 'abc' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { putAccepted: [ 'abc' ]}});
    });

    it('should run with accept-put header with multiple values', () => {
      const headers = new Headers({ 'accept-put': 'abc, def,ghi' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { putAccepted: [ 'abc', 'def', 'ghi' ]}});
    });
  });
});
