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

    it.todo('should test');

    it.todo('should run');
  });
});
