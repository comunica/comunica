import { Bus } from '@comunica/core';
import { ActorFunctionFactoryPredicate } from '../lib/ActorFunctionFactoryPredicate';

describe('ActorFunctionFactoryPredicate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryPredicate instance', () => {
    let actor: ActorFunctionFactoryPredicate;

    beforeEach(() => {
      actor = new ActorFunctionFactoryPredicate({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
