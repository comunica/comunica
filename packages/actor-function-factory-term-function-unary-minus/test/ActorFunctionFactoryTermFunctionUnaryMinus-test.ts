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

    it.todo('should test');

    it.todo('should run');
  });
});
