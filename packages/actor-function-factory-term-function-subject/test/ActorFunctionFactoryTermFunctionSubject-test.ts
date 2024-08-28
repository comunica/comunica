import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubject } from '../lib/ActorFunctionFactoryTermFunctionSubject';

describe('ActorFunctionFactoryTermFunctionSubject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubject instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubject;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubject({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
