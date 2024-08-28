import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMonth } from '../lib/ActorFunctionFactoryTermFunctionMonth';

describe('ActorFunctionFactoryTermFunctionMonth', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMonth instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMonth;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMonth({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
