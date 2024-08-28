import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrEnds } from '../lib/ActorFunctionFactoryTermFunctionStrEnds';

describe('ActorFunctionFactoryTermFunctionStrEnds', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrEnds instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrEnds;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrEnds({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
