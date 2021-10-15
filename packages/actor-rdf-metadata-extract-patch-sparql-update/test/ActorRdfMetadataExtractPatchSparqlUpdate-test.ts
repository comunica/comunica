import type { Readable } from 'stream';
import { Bus } from '@comunica/core';
import { ActorRdfMetadataExtractPatchSparqlUpdate } from '../lib/ActorRdfMetadataExtractPatchSparqlUpdate';

describe('ActorRdfMetadataExtractPatchSparqlUpdate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractPatchSparqlUpdate instance', () => {
    let actor: ActorRdfMetadataExtractPatchSparqlUpdate;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractPatchSparqlUpdate({ name: 'actor', bus });
      input = <any> {};
    });

    it('should test', () => {
      return expect(actor.test({ url: 'http://example.org/', metadata: input, requestTime: 0 })).resolves.toBeTruthy();
    });

    it('should run without empty headers', () => {
      return expect(actor.run({ url: 'http://example.org/', metadata: input, requestTime: 0 }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with empty headers', () => {
      const headers = {};
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0 }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with invalid accept-patch header', () => {
      const headers = { 'accept-patch': 'abc' };
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0 }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with valid accept-patch header', () => {
      const headers = { 'accept-patch': 'application/sparql-update' };
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0 }))
        .resolves.toEqual({ metadata: { patchSparqlUpdate: true }});
    });
  });
});
