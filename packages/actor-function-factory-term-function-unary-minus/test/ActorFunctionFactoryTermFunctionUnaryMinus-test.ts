import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUnaryMinus } from '../lib/ActorFunctionFactoryTermFunctionUnaryMinus';

describe('ActorFunctionFactoryTermFunctionUnaryMinus', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUnaryMinus instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUnaryMinus;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUnaryMinus({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
