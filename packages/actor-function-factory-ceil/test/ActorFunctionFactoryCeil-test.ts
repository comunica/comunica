import { Bus } from '@comunica/core';
import { ActorFunctionFactoryCeil } from '../lib/ActorFunctionFactoryCeil';

describe('ActorFunctionFactoryCeil', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryCeil instance', () => {
    let actor: ActorFunctionFactoryCeil;

    beforeEach(() => {
      actor = new ActorFunctionFactoryCeil({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
