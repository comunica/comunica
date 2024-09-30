import { KeysInitQuery, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfUpdateHypermediaSparql } from '../lib/ActorRdfUpdateHypermediaSparql';
import { QuadDestinationSparql } from '../lib/QuadDestinationSparql';
import '@comunica/utils-jest';

const DF = new DataFactory();

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

    it('should test', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { sparqlService: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists })).resolves.toPassTestVoid();
    });

    it('should not test on invalid metadata', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
    });

    it('should test on invalid metadata with forced destination type', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'sparql' }))
        .resolves.toPassTestVoid();
    });

    it('should test on invalid metadata when URL ends with /sparql', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc/sparql';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists }))
        .resolves.toPassTestVoid();
    });

    it('should not test on invalid metadata when URL ends with /sparql when checkUrlSuffix is false', async() => {
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
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
    });

    it('should not test on invalid metadata when URL ends with /update when checkUrlSuffix is false', async() => {
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
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor could not detect a SPARQL service description or URL ending on /sparql or /update.`);
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
      const context = new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysRdfUpdateQuads.destination.name]: 'abc',
      });
      const url = 'abc';
      const metadata = { sparqlService: 'service' };
      const exists = true;
      const { destination } = await actor.run({ context, url, metadata, exists });
      expect(destination).toEqual(expect.any(QuadDestinationSparql));
      expect((<any> destination).url).toBe('service');
    });

    it('should run without sparqlService metadata', async() => {
      const context = new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysRdfUpdateQuads.destination.name]: 'abc',
      });
      const url = 'abc';
      const metadata = {};
      const exists = true;
      const { destination } = await actor.run({ context, url, metadata, exists });
      expect(destination).toEqual(expect.any(QuadDestinationSparql));
      expect((<any> destination).url).toBe('abc');
    });
  });
});
