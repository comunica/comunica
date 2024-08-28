import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrAfter } from '../lib/ActorFunctionFactoryTermFunctionStrAfter';

describe('ActorFunctionFactoryTermFunctionStrAfter', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrAfter instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrAfter;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrAfter({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
