import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRand } from '../lib/ActorFunctionFactoryTermFunctionRand';

describe('ActorFunctionFactoryTermFunctionRand', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRand instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRand;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRand({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
