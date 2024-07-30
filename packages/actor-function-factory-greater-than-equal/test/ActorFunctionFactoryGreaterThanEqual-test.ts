import { Bus } from '@comunica/core';
import { ActorFunctionFactoryGreaterThanEqual } from '../lib/ActorFunctionFactoryGreaterThanEqual';

describe('ActorFunctionFactoryGreaterThanEqual', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryGreaterThanEqual instance', () => {
    let actor: ActorFunctionFactoryGreaterThanEqual;

    beforeEach(() => {
      actor = new ActorFunctionFactoryGreaterThanEqual({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
