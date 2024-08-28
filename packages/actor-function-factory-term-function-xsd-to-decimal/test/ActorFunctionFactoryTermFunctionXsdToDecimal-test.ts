import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDecimal } from '../lib/ActorFunctionFactoryTermFunctionXsdToDecimal';

describe('ActorFunctionFactoryTermFunctionXsdToDecimal', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDecimal instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDecimal;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDecimal({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
