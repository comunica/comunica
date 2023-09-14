import { Bus } from '@comunica/core';
import { ActorExpressionEvaluatorAggregateAverage } from '../lib/ActorExpressionEvaluatorAggregateAverage';

describe('ActorExpressionEvaluatorAggregateAverage', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorAggregateAverage instance', () => {
    let actor: ActorExpressionEvaluatorAggregateAverage;

    beforeEach(() => {
      actor = new ActorExpressionEvaluatorAggregateAverage({ name: 'actor', bus });
    });

    it('should test', () => {
      // Empty
    });

    //
    // it('should test', () => {
    // return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    // });
    //
    // it('should run', () => {
    // return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    // });
    //
  });
});
