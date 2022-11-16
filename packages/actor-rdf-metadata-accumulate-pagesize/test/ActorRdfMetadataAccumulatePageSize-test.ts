import { Bus } from '@comunica/core';
import { ActorRdfMetadataAccumulatePageSize } from '../lib/ActorRdfMetadataAccumulatePageSize';

describe('ActorRdfMetadataAccumulatePageSize', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataAccumulatePageSize instance', () => {
    let actor: ActorRdfMetadataAccumulatePageSize;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulatePageSize({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
