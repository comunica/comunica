import { Bus } from '@comunica/core';
import { ActorFunctionFactoryWrapperAll } from '../lib/ActorFunctionFactoryWrapperAll';

describe('ActorFunctionsWrapperAll', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionsWrapperAll instance', () => {
    let actor: ActorFunctionFactoryWrapperAll;

    beforeEach(() => {
      actor = new ActorFunctionFactoryWrapperAll({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
