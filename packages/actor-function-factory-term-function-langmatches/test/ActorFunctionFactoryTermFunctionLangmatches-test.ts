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

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
