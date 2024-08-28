import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionCoalesce } from '../lib/ActorFunctionFactoryExpressionFunctionCoalesce';

describe('ActorFunctionFactoryExpressionFunctionCoalesce', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionCoalesce instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionCoalesce;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionCoalesce({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
