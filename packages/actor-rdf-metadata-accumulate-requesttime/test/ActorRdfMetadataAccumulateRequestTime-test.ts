import { Bus } from '@comunica/core';
import { ActorRdfMetadataAccumulateRequestTime } from '../lib/ActorRdfMetadataAccumulateRequestTime';

describe('ActorRdfMetadataAccumulateRequestTime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataAccumulateRequestTime instance', () => {
    let actor: ActorRdfMetadataAccumulateRequestTime;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateRequestTime({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
