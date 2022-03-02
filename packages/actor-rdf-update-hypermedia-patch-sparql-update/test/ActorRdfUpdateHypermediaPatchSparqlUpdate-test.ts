import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfUpdateHypermediaPatchSparqlUpdate } from '../lib/ActorRdfUpdateHypermediaPatchSparqlUpdate';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

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

    it('should test', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).resolves.toBeTruthy();
    });

    it('should not test on invalid metadata', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor could not detect a destination with 'application/sparql-update' as 'Accept-Patch' header.`);
    });

    it('should not test on a non-existing destination', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = false;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor can only patch a destination that already exists.`);
    });

    it('should test on invalid metadata with forced destination type', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'patchSparqlUpdate' }))
        .resolves.toBeTruthy();
    });

    it('should not test on invalid metadata with forced destination type for different destination type', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'different' }))
        .rejects.toThrow('Actor actor is not able to handle destination type different.');
    });

    it('should run', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      expect(await actor.run({ context, url, metadata, exists })).toEqual({
        destination: expect.any(QuadDestinationPatchSparqlUpdate),
      });
    });
  });
});
