import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionIn } from '../lib/ActorFunctionFactoryExpressionFunctionIn';

describe('ActorFunctionFactoryExpressionFunctionIn', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionIn instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionIn;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionIn({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
