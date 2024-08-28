import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLesserThanEqual } from '../lib/ActorFunctionFactoryTermFunctionLesserThanEqual';

describe('ActorFunctionFactoryTermFunctionLesserThanEqual', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLesserThanEqual instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLesserThanEqual;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLesserThanEqual({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
