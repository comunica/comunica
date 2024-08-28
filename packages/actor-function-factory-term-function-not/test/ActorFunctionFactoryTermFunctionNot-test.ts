import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionNot } from '../lib/ActorFunctionFactoryTermFunctionNot';

describe('ActorFunctionFactoryTermFunctionNot', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionNot instance', () => {
    let actor: ActorFunctionFactoryTermFunctionNot;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionNot({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
