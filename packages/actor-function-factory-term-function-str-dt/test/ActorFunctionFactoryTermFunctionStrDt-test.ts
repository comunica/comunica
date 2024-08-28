import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrDt } from '../lib/ActorFunctionFactoryTermFunctionStrDt';

describe('ActorFunctionFactoryTermFunctionStrDt', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrDt instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrDt;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrDt({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
