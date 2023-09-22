import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateGroupConcat } from '../lib/ActorExpressionEvaluatorAggregateGroupConcat';

describe('ActorExpressionEvaluatorAggregateGroupConcat', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateGroupConcat instance', () => {
    let actor: ActorExpressionEvaluatorAggregateGroupConcat;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateGroupConcat({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
