import type { IExpressionEvaluator, IExtensionAggregator } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
} from '@comunica/utils-jest';
import { NamedAggregator } from '../lib/NamedAggregator';

const AF = new AlgebraFactory(DF);

function bindingsXY(y = '2'): ReturnType<typeof BF.bindings> {
  return BF.bindings([
    [ DF.variable('x'), DF.literal('1') ],
    [ DF.variable('y'), DF.literal(y) ],
  ]);
}

describe('NamedAggregator', () => {
  let aggregator: IExtensionAggregator;
  let evaluators: IExpressionEvaluator[];

  beforeEach(async() => {
    aggregator = {
      put: jest.fn(),
      result: jest.fn(() => DF.literal('result')),
    };
    const mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory();
    evaluators = await Promise.all([ 'x', 'y' ].map(variable => mediatorExpressionEvaluatorFactory.mediate({
      algExpr: AF.createTermExpression(DF.variable(variable)),
      context: getMockEEActionContext(),
    })));
  });

  it('should put the evaluated arguments', async() => {
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(bindingsXY());
    await namedAggregator.putBindings(bindingsXY());
    expect(aggregator.put).toHaveBeenCalledTimes(2);
    expect(aggregator.put).toHaveBeenNthCalledWith(1, [ DF.literal('1'), DF.literal('2') ]);
    expect(aggregator.put).toHaveBeenNthCalledWith(2, [ DF.literal('1'), DF.literal('2') ]);
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('result'));
  });

  it('should put each distinct list of arguments once with distinct', async() => {
    const namedAggregator = new NamedAggregator(evaluators, true, aggregator);
    await namedAggregator.putBindings(bindingsXY('2'));
    await namedAggregator.putBindings(bindingsXY('3'));
    await namedAggregator.putBindings(bindingsXY('2'));
    expect(aggregator.put).toHaveBeenCalledTimes(2);
    expect(aggregator.put).toHaveBeenNthCalledWith(1, [ DF.literal('1'), DF.literal('2') ]);
    expect(aggregator.put).toHaveBeenNthCalledWith(2, [ DF.literal('1'), DF.literal('3') ]);
  });

  it('should support an asynchronous aggregator', async() => {
    aggregator = {
      put: jest.fn(async() => {}),
      result: async() => DF.literal('result'),
    };
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(bindingsXY());
    expect(aggregator.put).toHaveBeenCalledWith([ DF.literal('1'), DF.literal('2') ]);
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('result'));
  });

  it('should skip bindings for which an argument uses an unbound variable', async() => {
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings([[ DF.variable('x'), DF.literal('1') ]]));
    expect(aggregator.put).not.toHaveBeenCalled();
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('result'));
  });

  it('should have no result when evaluating an argument errors', async() => {
    const evaluate = jest.fn(async() => {
      throw new Error('evaluation error');
    });
    evaluators[1].evaluate = evaluate;
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(bindingsXY());
    await namedAggregator.putBindings(bindingsXY());
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(aggregator.put).not.toHaveBeenCalled();
    await expect(namedAggregator.result()).resolves.toBeUndefined();
    expect(aggregator.result).not.toHaveBeenCalled();
  });

  it('should not put arguments evaluated after an error occurred', async() => {
    let resolveEvaluation: () => void;
    const evaluation = new Promise<void>((resolve) => {
      resolveEvaluation = resolve;
    });
    jest.spyOn(evaluators[1], 'evaluate')
      .mockImplementationOnce(async() => {
        await evaluation;
        return DF.literal('2');
      })
      .mockImplementationOnce(async() => {
        throw new Error('evaluation error');
      });
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    const putSlow = namedAggregator.putBindings(bindingsXY());
    await namedAggregator.putBindings(bindingsXY());
    resolveEvaluation!();
    await putSlow;
    expect(aggregator.put).not.toHaveBeenCalled();
  });

  it('should have no result when putting arguments errors', async() => {
    aggregator.put = () => {
      throw new Error('put error');
    };
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(bindingsXY());
    await expect(namedAggregator.result()).resolves.toBeUndefined();
  });

  it('should have no result when the result errors', async() => {
    aggregator.result = async() => {
      throw new Error('result error');
    };
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await expect(namedAggregator.result()).resolves.toBeUndefined();
  });
});
