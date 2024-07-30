import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrBefore } from '../lib/ActorFunctionFactoryStrBefore';

describe('ActorFunctionFactoryStrBefore', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrBefore instance', () => {
    let actor: ActorFunctionFactoryStrBefore;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrBefore({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
