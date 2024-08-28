import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionNotIn } from '../lib/ActorFunctionFactoryExpressionFunctionNotIn';

describe('ActorFunctionFactoryExpressionFunctionNotIn', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionNotIn instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionNotIn;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionNotIn({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
