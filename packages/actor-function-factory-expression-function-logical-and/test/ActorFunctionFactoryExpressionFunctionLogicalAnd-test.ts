import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionLogicalAnd } from '../lib/ActorFunctionFactoryExpressionFunctionLogicalAnd';

describe('ActorFunctionFactoryExpressionFunctionLogicalAnd', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionLogicalAnd instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionLogicalAnd;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionLogicalAnd({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
