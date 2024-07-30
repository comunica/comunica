import { Bus } from '@comunica/core';
import { ActorFunctionFactorySha1 } from '../lib/ActorFunctionFactorySha1';

describe('ActorFunctionFactorySha1', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySha1 instance', () => {
    let actor: ActorFunctionFactorySha1;

    beforeEach(() => {
      actor = new ActorFunctionFactorySha1({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
