import { Bus } from '@comunica/core';
import { ActorFunctionFactoryDivision } from '../lib/ActorFunctionFactoryDivision';

describe('ActorFunctionFactoryDivision', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryDivision instance', () => {
    let actor: ActorFunctionFactoryDivision;

    beforeEach(() => {
      actor = new ActorFunctionFactoryDivision({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
