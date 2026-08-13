import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractQueryAccepted } from '../lib/ActorRdfMetadataExtractQueryAccepted';
import '@comunica/utils-jest';

describe('ActorRdfMetadataExtractQueryAccepted', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractQueryAccepted instance', () => {
    let actor: ActorRdfMetadataExtractQueryAccepted;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractQueryAccepted({ name: 'actor', bus });
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

    it('should run with accept-query header with one value', async() => {
      const headers = new Headers({ 'accept-query': 'application/sparql-query' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { queryAccepted: [ 'application/sparql-query' ]}});
    });

    it('should run with accept-query header with multiple values', async() => {
      const headers = new Headers({ 'accept-query': 'application/sparql-query, application/graphql-query,application/sql' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { queryAccepted: [ 'application/sparql-query', 'application/graphql-query', 'application/sql' ]}});
    });
  });
});

