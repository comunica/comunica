import { Bus } from '@comunica/core';
import type { ActorFunctionFactoryExpressionFunctionIn } from '../lib/ActorFunctionFactoryExpressionFunctionIn';

describe('ActorFunctionFactoryExpressionFunctionIn', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionIn instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionIn;

    beforeEach(() => {
      // Actor = new ActorFunctionFactoryExpressionFunctionIn({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
