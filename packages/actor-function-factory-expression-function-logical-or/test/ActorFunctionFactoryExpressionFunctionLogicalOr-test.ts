import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionLogicalOr } from '../lib/ActorFunctionFactoryExpressionFunctionLogicalOr';

describe('ActorFunctionFactoryExpressionFunctionLogicalOr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionLogicalOr instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionLogicalOr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionLogicalOr({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
