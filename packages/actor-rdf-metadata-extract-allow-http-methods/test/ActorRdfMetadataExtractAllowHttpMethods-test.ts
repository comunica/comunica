import type { Readable } from 'stream';
import { Bus } from '@comunica/core';
import { ActorRdfMetadataExtractAllowHttpMethods } from '../lib/ActorRdfMetadataExtractAllowHttpMethods';

describe('ActorRdfMetadataExtractAllowHttpMethods', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractAllowHttpMethods instance', () => {
    let actor: ActorRdfMetadataExtractAllowHttpMethods;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractAllowHttpMethods({ name: 'actor', bus });
      input = <any> {};
    });

    it('should test', () => {
      return expect(actor.test({ url: 'http://example.org/', metadata: input })).resolves.toBeTruthy();
    });

    it('should run without empty headers', () => {
      return expect(actor.run({ url: 'http://example.org/', metadata: input }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with empty headers', () => {
      const headers = {};
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers }))
        .resolves.toEqual({ metadata: {}});
    });

    it('should run with allow header with one value', () => {
      const headers = { allow: 'abc' };
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc' ]}});
    });

    it('should run with allow header with multiple values', () => {
      const headers = { allow: 'abc, def,ghi' };
      return expect(actor.run({ url: 'http://example.org/', metadata: input, headers }))
        .resolves.toEqual({ metadata: { allowHttpMethods: [ 'abc', 'def', 'ghi' ]}});
    });
  });
});
