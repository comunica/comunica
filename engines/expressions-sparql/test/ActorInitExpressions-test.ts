import { Bus } from '@comunica/core';
import '@comunica/utils-jest';
import { ActorInitExpressions } from '../lib/ActorInitExpressions';

describe('ActorInitExpressions', () => {
  const mediatorExpressionEvaluatorFactory: any = { mediate: jest.fn() };
  const mediatorTermComparatorFactory: any = { mediate: jest.fn() };
  const mediatorBindingsAggregatorFactory: any = { mediate: jest.fn() };
  let actor: ActorInitExpressions;

  beforeEach(() => {
    actor = new ActorInitExpressions({
      bus: new Bus({ name: 'bus' }),
      name: 'actor',
      mediatorExpressionEvaluatorFactory,
      mediatorTermComparatorFactory,
      mediatorBindingsAggregatorFactory,
    });
  });

  it('exposes the expression evaluation mediators.', () => {
    expect(actor.mediatorExpressionEvaluatorFactory).toBe(mediatorExpressionEvaluatorFactory);
    expect(actor.mediatorTermComparatorFactory).toBe(mediatorTermComparatorFactory);
    expect(actor.mediatorBindingsAggregatorFactory).toBe(mediatorBindingsAggregatorFactory);
  });

  it('tests true.', async() => {
    await expect(actor.test(<any> {})).resolves.toPassTestVoid();
  });

  it('rejects being run.', async() => {
    await expect(actor.run(<any> {})).rejects
      .toThrow('ActorInitExpressions#run is not supported, use an ExpressionEngine instead.');
  });
});
