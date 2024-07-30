import { Bus } from '@comunica/core';
import { ActorFunctionFactorySha512 } from '../lib/ActorFunctionFactorySha512';

describe('ActorFunctionFactorySha512', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySha512 instance', () => {
    let actor: ActorFunctionFactorySha512;

    beforeEach(() => {
      actor = new ActorFunctionFactorySha512({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
