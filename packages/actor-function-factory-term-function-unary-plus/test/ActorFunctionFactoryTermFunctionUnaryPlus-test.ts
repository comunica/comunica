import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUnaryPlus } from '../lib/ActorFunctionFactoryTermFunctionUnaryPlus';

describe('ActorFunctionFactoryTermFunctionUnaryPlus', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUnaryPlus instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUnaryPlus;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUnaryPlus({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
