import { Bus } from '@comunica/core';
import { ActorFunctionFactorySha384 } from '../lib/ActorFunctionFactorySha384';

describe('ActorFunctionFactorySha384', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySha384 instance', () => {
    let actor: ActorFunctionFactorySha384;

    beforeEach(() => {
      actor = new ActorFunctionFactorySha384({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
