import { Bus } from '@comunica/core';
import { ActorRdfJoinInnerMultiAdaptiveDestroy } from '../lib/ActorRdfJoinInnerMultiAdaptiveDestroy';

describe('ActorRdfJoinInnerMultiAdaptiveDestroy', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinInnerMultiAdaptiveDestroy instance', () => {
    let actor: ActorRdfJoinInnerMultiAdaptiveDestroy;

    beforeEach(() => {
      actor = new ActorRdfJoinInnerMultiAdaptiveDestroy({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
