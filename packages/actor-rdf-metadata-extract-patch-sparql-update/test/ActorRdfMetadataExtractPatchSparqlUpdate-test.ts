import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractPatchSparqlUpdate } from '../lib/ActorRdfMetadataExtractPatchSparqlUpdate';
import '@comunica/utils-jest';

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

    it('should run with invalid accept-patch header', async() => {
      const headers = new Headers({ 'accept-patch': 'abc' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with valid accept-patch header', async() => {
      const headers = new Headers({ 'accept-patch': 'application/sparql-update' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { patchSparqlUpdate: true }});
    });

    it('should run with valid ms-author-via header', async() => {
      const headers = new Headers({ 'ms-author-via': 'SPARQL' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { patchSparqlUpdate: true }});
    });
  });
});
