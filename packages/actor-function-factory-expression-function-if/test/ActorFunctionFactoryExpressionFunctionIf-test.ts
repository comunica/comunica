import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionIf } from '../lib/ActorFunctionFactoryExpressionFunctionIf';

describe('ActorFunctionFactoryExpressionFunctionIf', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionIf instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionIf;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionIf({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
