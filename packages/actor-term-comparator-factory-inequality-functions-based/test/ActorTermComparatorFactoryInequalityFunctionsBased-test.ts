import { Bus } from '@comunica/core';
import {
  ActorTermComparatorFactoryInequalityFunctionsBased,
} from '../lib/ActorTermComparatorFactoryInequalityFunctionsBased';

describe('ActorTermComparatorFactoryInequalityFunctionsBased', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorTermComparatorFactoryInequalityFunctionsBased instance', () => {
    let actor: ActorTermComparatorFactoryInequalityFunctionsBased;

    beforeEach(() => {
      actor = new ActorTermComparatorFactoryInequalityFunctionsBased({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
