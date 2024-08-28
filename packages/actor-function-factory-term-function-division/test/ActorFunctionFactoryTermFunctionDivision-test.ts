import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDivision } from '../lib/ActorFunctionFactoryTermFunctionDivision';

describe('ActorFunctionFactoryTermFunctionDivision', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDivision instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDivision;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDivision({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
