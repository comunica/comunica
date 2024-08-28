import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionGreaterThanEqual } from '../lib/ActorFunctionFactoryTermFunctionGreaterThanEqual';

describe('ActorFunctionFactoryTermFunctionGreaterThanEqual', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionGreaterThanEqual instance', () => {
    let actor: ActorFunctionFactoryTermFunctionGreaterThanEqual;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionGreaterThanEqual({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
