import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionLogicalAnd } from '../lib/ActorFunctionFactoryExpressionFunctionLogicalAnd';

describe('ActorFunctionFactoryExpressionFunctionLogicalAnd', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionLogicalAnd instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionLogicalAnd;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionLogicalAnd({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
