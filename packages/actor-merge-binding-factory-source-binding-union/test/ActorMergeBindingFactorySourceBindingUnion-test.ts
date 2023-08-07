import { Bus } from '@comunica/core';
import { ActorMergeBindingFactorySourceBindingUnion } from '../lib/ActorMergeBindingFactorySourceBindingUnion';

describe('ActorMergeBindingFactorySourceBindingUnion', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorMergeBindingFactorySourceBindingUnion instance', () => {
    let actor: ActorMergeBindingFactorySourceBindingUnion;

    beforeEach(() => {
      actor = new ActorMergeBindingFactorySourceBindingUnion({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
