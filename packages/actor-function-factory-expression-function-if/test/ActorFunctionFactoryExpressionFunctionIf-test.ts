import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionIf } from '../lib/ActorFunctionFactoryExpressionFunctionIf';

describe('ActorFunctionFactoryExpressionFunctionIf', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionIf instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionIf;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionIf({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
