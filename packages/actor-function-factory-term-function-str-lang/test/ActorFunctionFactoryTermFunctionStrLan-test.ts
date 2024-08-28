import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrLang } from '../lib/ActorFunctionFactoryTermFunctionStrLang';

describe('ActorFunctionFactoryTermFunctionStrLan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrLan instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrLang;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrLang({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
