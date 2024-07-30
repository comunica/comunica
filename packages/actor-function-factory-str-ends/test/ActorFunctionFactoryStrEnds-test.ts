import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrEnds } from '../lib/ActorFunctionFactoryStrEnds';

describe('ActorFunctionFactoryStrEnds', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrEnds instance', () => {
    let actor: ActorFunctionFactoryStrEnds;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrEnds({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
