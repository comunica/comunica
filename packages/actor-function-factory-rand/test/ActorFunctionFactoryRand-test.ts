import { Bus } from '@comunica/core';
import { ActorFunctionFactoryRand } from '../lib/ActorFunctionFactoryRand';

describe('ActorFunctionFactoryRand', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryRand instance', () => {
    let actor: ActorFunctionFactoryRand;

    beforeEach(() => {
      actor = new ActorFunctionFactoryRand({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
