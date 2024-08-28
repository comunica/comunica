import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionSameTerm } from '../lib/ActorFunctionFactoryExpressionFunctionSameTerm';

describe('ActorFunctionFactoryExpressionFunctionSameTerm', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionSameTerm instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionSameTerm;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionSameTerm({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
