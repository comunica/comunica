import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateWildcardCount } from '../lib/ActorExpressionEvaluatorAggregateWildcardCount';

describe('ActorExpressionEvaluatorAggregateWildcardCount', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateWildcardCount instance', () => {
    let actor: ActorExpressionEvaluatorAggregateWildcardCount;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateWildcardCount({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
