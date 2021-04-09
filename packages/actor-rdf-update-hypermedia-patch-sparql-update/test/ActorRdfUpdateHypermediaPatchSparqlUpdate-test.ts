import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfUpdateHypermediaPatchSparqlUpdate } from '../lib/ActorRdfUpdateHypermediaPatchSparqlUpdate';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

describe('ActorRdfUpdateHypermediaPatchSparqlUpdate', () => {
  let bus: any;
  let mediatorHttp: any;
  let mediatorRdfSerialize: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: jest.fn(() => ({
        body: 'BODY',
      })),
    };
    mediatorRdfSerialize = {
      mediate: jest.fn(() => ({
        todo: 'TRUE',
      })),
    };
  });

  describe('An ActorRdfUpdateHypermediaPatchSparqlUpdate instance', () => {
    let actor: ActorRdfUpdateHypermediaPatchSparqlUpdate;

    beforeEach(() => {
      actor = new ActorRdfUpdateHypermediaPatchSparqlUpdate({ name: 'actor', bus, mediatorHttp, mediatorRdfSerialize });
    });

    it('should test', () => {
      const context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).resolves.toBeTruthy();
    });

    it('should not test on invalid metadata', () => {
      const context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor could not detect a destination with 'application/sparql-update' as 'Accept-Patch' header.`);
    });

    it('should test on invalid metadata with forced destination type', () => {
      const context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'patchSparqlUpdate' }))
        .resolves.toBeTruthy();
    });

    it('should not test on invalid metadata with forced destination type for different destination type', () => {
      const context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'different' }))
        .rejects.toThrow('Actor actor is not able to handle destination type different.');
    });

    it('should run', async() => {
      const context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
      const url = 'abc';
      const metadata = { patchSparqlUpdate: true };
      const exists = true;
      expect(await actor.run({ context, url, metadata, exists })).toEqual({
        destination: expect.any(QuadDestinationPatchSparqlUpdate),
      });
    });
  });
});
