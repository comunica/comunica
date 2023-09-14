import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateSample } from '../lib/ActorExpressionEvaluatorAggregateSample';

describe('ActorExpressionEvaluatorAggregateSample', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateSample instance', () => {
    let actor: ActorExpressionEvaluatorAggregateSample;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateSample({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
