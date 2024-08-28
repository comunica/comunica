import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMultiplication } from '../lib/ActorFunctionFactoryTermFunctionMultiplication';

describe('ActorFunctionFactoryTermFunctionMultiplication', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMultiplication instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMultiplication;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMultiplication({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
