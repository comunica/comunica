import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateMax } from '../lib/ActorExpressionEvaluatorAggregateMax';

describe('ActorExpressionEvaluatorAggregateMax', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateMax instance', () => {
    let actor: ActorExpressionEvaluatorAggregateMax;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateMax({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
