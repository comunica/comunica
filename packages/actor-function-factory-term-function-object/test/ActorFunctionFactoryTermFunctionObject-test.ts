import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionObject } from '../lib/ActorFunctionFactoryTermFunctionObject';

describe('ActorFunctionFactoryTermFunctionObject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionObject instance', () => {
    let actor: ActorFunctionFactoryTermFunctionObject;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionObject({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
