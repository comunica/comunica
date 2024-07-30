import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrAfter } from '../lib/ActorFunctionFactoryStrAfter';

describe('ActorFunctionFactoryStrAfter', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrAfter instance', () => {
    let actor: ActorFunctionFactoryStrAfter;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrAfter({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
