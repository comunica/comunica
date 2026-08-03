import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractServerSoftware } from '../lib/ActorRdfMetadataExtractServerSoftware';
import '@comunica/utils-jest';

describe('ActorRdfMetadataExtractServerSoftware', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractServerSoftware instance', () => {
    let actor: ActorRdfMetadataExtractServerSoftware;
    let input: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractServerSoftware({ name: 'actor', bus });
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

    it('should run with a server header', async() => {
      const headers = new Headers({ server: 'Virtuoso/08.03.3332' });
      await expect(actor.run({ url: 'http://example.org/', metadata: input, headers, requestTime: 0, context }))
        .resolves.toEqual({ metadata: { serverSoftware: 'Virtuoso/08.03.3332' }});
    });
  });
});
