import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateSum } from '../lib/ActorExpressionEvaluatorAggregateSum';

describe('ActorExpressionEvaluatorAggregateSum', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateSum instance', () => {
    let actor: ActorExpressionEvaluatorAggregateSum;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateSum({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
