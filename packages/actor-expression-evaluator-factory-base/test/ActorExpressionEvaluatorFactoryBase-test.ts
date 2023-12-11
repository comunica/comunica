import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorFactoryBase } from '../lib/ActorExpressionEvaluatorFactoryBase';

describe('ActorExpressionEvaluatorFactoryBase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorFactoryBase instance', () => {
    let actor: ActorExpressionEvaluatorFactoryBase;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorFactoryBase({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
