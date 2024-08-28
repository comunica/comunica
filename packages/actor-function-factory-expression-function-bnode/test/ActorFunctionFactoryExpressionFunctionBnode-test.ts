import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionBnode } from '../lib/ActorFunctionFactoryExpressionFunctionBnode';

describe('ActorFunctionFactoryExpressionFunctionBnode', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionBnode instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionBnode;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionBnode({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
