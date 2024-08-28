import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDivision } from '../lib/ActorFunctionFactoryTermFunctionDivision';

describe('ActorFunctionFactoryTermFunctionDivision', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDivision instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDivision;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDivision({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
