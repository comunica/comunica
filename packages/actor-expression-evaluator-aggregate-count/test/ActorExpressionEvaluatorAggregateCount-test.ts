import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateCount } from '../lib/ActorExpressionEvaluatorAggregateCount';

describe('ActorExpressionEvaluatorAggregateCount', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateCount instance', () => {
    let actor: ActorExpressionEvaluatorAggregateCount;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateCount({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
