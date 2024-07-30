import { Bus } from '@comunica/core';
import { ActorFunctionFactorySha256 } from '../lib/ActorFunctionFactorySha256';

describe('ActorFunctionFactorySha256', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySha256 instance', () => {
    let actor: ActorFunctionFactorySha256;

    beforeEach(() => {
      actor = new ActorFunctionFactorySha256({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
