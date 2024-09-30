import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfUpdateHypermediaPatchSparqlUpdate } from '../lib/ActorRdfUpdateHypermediaPatchSparqlUpdate';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';
import '@comunica/utils-jest';

describe('ActorRdfUpdateHypermediaPatchSparqlUpdate', () => {
  let bus: any;
  let mediatorHttp: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: jest.fn(() => ({
        body: 'BODY',
      })),
    };
  });

  describe('An ActorRdfUpdateHypermediaPatchSparqlUpdate instance', () => {
    let actor: ActorRdfUpdateHypermediaPatchSparqlUpdate;

    beforeEach(() => {
      actor = new ActorRdfUpdateHypermediaPatchSparqlUpdate({ name: 'actor', bus, mediatorHttp });
    });

    it('should test', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists })).resolves.toPassTestVoid();
    });

    it('should not test on invalid metadata', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor could not detect a destination with 'application/sparql-update' as 'Accept-Patch' header.`);
    });

    it('should not test on a non-existing destination', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = false;
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor can only patch a destination that already exists.`);
    });

    it('should test on invalid metadata with forced destination type', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'patchSparqlUpdate' }))
        .resolves.toPassTestVoid();
    });

    it('should not test on invalid metadata with forced destination type for different destination type', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'different' }))
        .resolves.toFailTest('Actor actor is not able to handle destination type different.');
    });

    it('should run', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      await expect(actor.run({ context, url, metadata, exists })).resolves.toEqual({
        destination: expect.any(QuadDestinationPatchSparqlUpdate),
      });
    });
  });
});
