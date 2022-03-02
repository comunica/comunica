import type { Readable } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Headers } from 'cross-fetch';
import { ActorRdfMetadataExtractPatchSparqlUpdate } from '../lib/ActorRdfMetadataExtractPatchSparqlUpdate';

describe('ActorRdfMetadataExtractPatchSparqlUpdate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractPatchSparqlUpdate instance', () => {
    let actor: ActorRdfMetadataExtractPatchSparqlUpdate;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractPatchSparqlUpdate({ name: 'actor', bus });
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
      const headers = new Headers({});
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with invalid accept-patch header', () => {
      const headers = new Headers({ 'accept-patch': 'abc' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with valid accept-patch header', () => {
      const headers = new Headers({ 'accept-patch': 'application/sparql-update' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { patchSparqlUpdate: true }});
    });

    it('should run with valid ms-author-via header', () => {
      const headers = new Headers({ 'ms-author-via': 'SPARQL' });
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { patchSparqlUpdate: true }});
    });
  });
});
