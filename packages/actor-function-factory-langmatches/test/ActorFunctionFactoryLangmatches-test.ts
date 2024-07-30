import { Bus } from '@comunica/core';
import { ActorFunctionFactoryLangmatches } from '../lib/ActorFunctionFactoryLangmatches';

describe('ActorFunctionFactoryLangmatches', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryLangmatches instance', () => {
    let actor: ActorFunctionFactoryLangmatches;

    beforeEach(() => {
      actor = new ActorFunctionFactoryLangmatches({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
