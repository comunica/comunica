import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLangmatches } from '../lib/ActorFunctionFactoryTermFunctionLangmatches';

describe('ActorFunctionFactoryTermFunctionLangmatches', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLangmatches instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLangmatches;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLangmatches({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
