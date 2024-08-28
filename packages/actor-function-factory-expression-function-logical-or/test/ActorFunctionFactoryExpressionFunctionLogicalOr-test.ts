import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionLogicalOr } from '../lib/ActorFunctionFactoryExpressionFunctionLogicalOr';

describe('ActorFunctionFactoryExpressionFunctionLogicalOr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionLogicalOr instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionLogicalOr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionLogicalOr({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
