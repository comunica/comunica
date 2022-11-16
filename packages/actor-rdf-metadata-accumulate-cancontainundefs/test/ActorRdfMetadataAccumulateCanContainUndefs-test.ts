import { Bus } from '@comunica/core';
import { ActorRdfMetadataAccumulateCanContainUndefs } from '../lib/ActorRdfMetadataAccumulateCanContainUndefs';

describe('ActorRdfMetadataAccumulateCanContainUndefs', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataAccumulateCanContainUndefs instance', () => {
    let actor: ActorRdfMetadataAccumulateCanContainUndefs;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateCanContainUndefs({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
