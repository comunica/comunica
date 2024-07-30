import { Bus } from '@comunica/core';
import { ActorFunctionFactoryRound } from '../lib/ActorFunctionFactoryRound';

describe('ActorFunctionFactoryRound', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryRound instance', () => {
    let actor: ActorFunctionFactoryRound;

    beforeEach(() => {
      actor = new ActorFunctionFactoryRound({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
