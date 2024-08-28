import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrBefore } from '../lib/ActorFunctionFactoryTermFunctionStrBefore';

describe('ActorFunctionFactoryTermFunctionStrBefore', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrBefore instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrBefore;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrBefore({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
