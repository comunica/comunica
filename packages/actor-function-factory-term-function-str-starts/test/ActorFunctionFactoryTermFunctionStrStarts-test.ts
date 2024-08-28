import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrStarts } from '../lib/ActorFunctionFactoryTermFunctionStrStarts';

describe('ActorFunctionFactoryTermFunctionStrStarts', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrStarts instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrStarts;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrStarts({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
