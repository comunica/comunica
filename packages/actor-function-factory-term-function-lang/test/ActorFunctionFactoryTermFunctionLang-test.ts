import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLang } from '../lib/ActorFunctionFactoryTermFunctionLang';

describe('ActorFunctionFactoryTermFunctionLang', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLang instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLang;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLang({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
