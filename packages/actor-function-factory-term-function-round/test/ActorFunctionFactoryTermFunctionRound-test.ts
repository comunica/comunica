import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRound } from '../lib/ActorFunctionFactoryTermFunctionRound';

describe('ActorFunctionFactoryTermFunctionRound', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRound instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRound;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRound({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
