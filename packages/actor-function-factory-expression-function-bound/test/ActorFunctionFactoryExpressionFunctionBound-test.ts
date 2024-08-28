import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionBound } from '../lib/ActorFunctionFactoryExpressionFunctionBound';

describe('ActorFunctionFactoryExpressionFunctionBound', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionBound instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionBound;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionBound({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
