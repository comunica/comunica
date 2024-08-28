import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionConcat } from '../lib/ActorFunctionFactoryExpressionFunctionConcat';

describe('ActorFunctionFactoryExpressionFunctionConcat', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionConcat instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionConcat;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionConcat({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
