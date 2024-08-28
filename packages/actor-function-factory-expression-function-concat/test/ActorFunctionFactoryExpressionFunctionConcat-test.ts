import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionConcat } from '../lib/ActorFunctionFactoryExpressionFunctionConcat';

describe('ActorFunctionFactoryExpressionFunctionConcat', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionConcat instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionConcat;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionConcat({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
