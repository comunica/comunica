import { Bus } from '@comunica/core';
import { ActorFunctionFactoryUnaryPlus } from '../lib/ActorFunctionFactoryUnaryPlus';

describe('ActorFunctionFactoryUnaryPlus', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryUnaryPlus instance', () => {
    let actor: ActorFunctionFactoryUnaryPlus;

    beforeEach(() => {
      actor = new ActorFunctionFactoryUnaryPlus({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
