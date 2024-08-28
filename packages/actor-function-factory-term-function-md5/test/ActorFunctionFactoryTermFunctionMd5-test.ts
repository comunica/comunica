import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMd5 } from '../lib/ActorFunctionFactoryTermFunctionMd5';

describe('ActorFunctionFactoryTermFunctionMd5', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMd5 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMd5;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMd5({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
