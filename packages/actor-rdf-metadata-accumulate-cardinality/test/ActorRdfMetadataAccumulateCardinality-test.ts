import { Bus } from '@comunica/core';
import { ActorRdfMetadataAccumulateCardinality } from '../lib/ActorRdfMetadataAccumulateCardinality';

describe('ActorRdfMetadataAccumulateCardinality', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataAccumulateCardinality instance', () => {
    let actor: ActorRdfMetadataAccumulateCardinality;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateCardinality({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
