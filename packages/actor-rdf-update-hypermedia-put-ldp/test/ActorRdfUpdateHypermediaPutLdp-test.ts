import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfUpdateHypermediaPutLdp } from '../lib/ActorRdfUpdateHypermediaPutLdp';
import { QuadDestinationPutLdp } from '../lib/QuadDestinationPutLdp';
import '@comunica/utils-jest';

describe('ActorRdfUpdateHypermediaPutLdp', () => {
  let bus: any;
  let mediatorHttp: any;
  let mediatorRdfSerializeMediatypes: any;
  let mediatorRdfSerialize: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: jest.fn(() => ({
        body: 'BODY',
      })),
    };
    mediatorRdfSerializeMediatypes = {
      mediate: jest.fn(() => ({
        todo: 'TRUE',
      })),
    };
    mediatorRdfSerialize = {
      mediate: jest.fn(() => ({
        todo: 'TRUE',
      })),
    };
  });

  describe('An ActorRdfUpdateHypermediaPutLdp instance', () => {
    let actor: ActorRdfUpdateHypermediaPutLdp;

    beforeEach(() => {
      actor = new ActorRdfUpdateHypermediaPutLdp({
        name: 'actor',
        bus,
        mediatorHttp,
        mediatorRdfSerializeMediatypes,
        mediatorRdfSerialize,
      });
    });

    it('should test', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { allowHttpMethods: [ 'OTHER', 'PUT' ]};
      const exists = false;
      await expect(actor.test({ context, url, metadata, exists })).resolves.toPassTestVoid();
    });

    it('should not test on missing allowHttpMethods PUT in metadata', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { allowHttpMethods: [ 'OTHER' ]};
      const exists = false;
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor could not detect a destination with 'Allow: PUT' header.`);
    });

    it('should not test on an existing destination', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { allowHttpMethods: [ 'PUT' ]};
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists })).resolves
        .toFailTest(`Actor actor can only put on a destination that does not already exists.`);
    });

    it('should test on invalid metadata with forced destination type', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = false;
      await expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'putLdp' }))
        .resolves.toPassTestVoid();
    });

    it('should test on invalid metadata with forced destination type on an existing destination', async() => {
      const context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      const url = 'abc';
      const metadata = { somethingElse: true };
      const exists = true;
      await expect(actor.test({ context, url, metadata, exists, forceDestinationType: 'putLdp' }))
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
      const metadata = { putLdp: true };
      const exists = true;
      await expect(actor.run({ context, url, metadata, exists })).resolves.toEqual({
        destination: expect.any(QuadDestinationPutLdp),
      });
    });
  });
});
