import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateMin } from '../lib/ActorExpressionEvaluatorAggregateMin';

describe('ActorExpressionEvaluatorAggregateMin', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateMin instance', () => {
    let actor: ActorExpressionEvaluatorAggregateMin;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateMin({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
