import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionReplace } from '../lib/ActorFunctionFactoryTermFunctionReplace';

describe('ActorFunctionFactoryTermFunctionReplace', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionReplace instance', () => {
    let actor: ActorFunctionFactoryTermFunctionReplace;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionReplace({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
