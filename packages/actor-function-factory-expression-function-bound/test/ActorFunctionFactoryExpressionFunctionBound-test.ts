import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionBound } from '../lib/ActorFunctionFactoryExpressionFunctionBound';

describe('ActorFunctionFactoryExpressionFunctionBound', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionBound instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionBound;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionBound({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
