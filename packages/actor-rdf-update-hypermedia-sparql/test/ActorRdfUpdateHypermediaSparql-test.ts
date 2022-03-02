import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfUpdateHypermediaSparql } from '../lib/ActorRdfUpdateHypermediaSparql';
import { QuadDestinationSparql } from '../lib/QuadDestinationSparql';

describe('ActorRdfUpdateHypermediaSparql', () => {
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

  describe('An ActorRdfUpdateHypermediaSparql instance', () => {
    let actor: ActorRdfUpdateHypermediaSparql;

    beforeEach(() => {
      actor = new ActorRdfUpdateHypermediaSparql({
        name: 'actor',
        bus,
        mediatorHttp,
        checkUrlSuffixSparql: true,
        checkUrlSuffixUpdate: true,
      });
    });

    it('should test', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { sparqlService: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).resolves.toBeTruthy();
    });

    it('should not test on invalid metadata', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
    });

    it('should test on invalid metadata with forced destination type', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'sparql' }))
        .resolves.toBeTruthy();
    });

    it('should test on invalid metadata when URL ends with /sparql', () => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc/sparql';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists }))
        .resolves.toBeTruthy();
    });

    it('should not test on invalid metadata when URL ends with /sparql when checkUrlSuffix is false', () => {
      actor = new ActorRdfUpdateHypermediaSparql({
        name: 'actor',
        bus,
        mediatorHttp,
        checkUrlSuffixSparql: false,
        checkUrlSuffixUpdate: true,
      });
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc/sparql';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
    });

    it('should not test on invalid metadata when URL ends with /update when checkUrlSuffix is false', () => {
      actor = new ActorRdfUpdateHypermediaSparql({
        name: 'actor',
        bus,
        mediatorHttp,
        checkUrlSuffixSparql: true,
        checkUrlSuffixUpdate: false,
      });
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc/update';
      const metadata = { somethingElse: true };
      const exists = true;
      return expect(actor.test({ context, url, metadata, exists })).rejects
        .toThrow(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
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
      const metadata = { sparqlService: 'service' };
      const exists = true;
      const { destination } = await actor.run({ context, url, metadata, exists });
      expect(destination).toEqual(expect.any(QuadDestinationSparql));
      expect((<any> destination).url).toEqual('service');
    });

    it('should run without sparqlService metadata', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = {};
      const exists = true;
      const { destination } = await actor.run({ context, url, metadata, exists });
      expect(destination).toEqual(expect.any(QuadDestinationSparql));
      expect((<any> destination).url).toEqual('abc');
    });
  });
});
