import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsLiteral } from '../lib/ActorFunctionFactoryTermFunctionIsLiteral';

describe('ActorFunctionFactoryTermFunctionIsLiteral', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsLiteral instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsLiteral;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsLiteral({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
