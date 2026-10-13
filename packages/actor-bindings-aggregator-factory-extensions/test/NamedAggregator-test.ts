import type { IExpressionEvaluator, IExtensionAggregator } from '@comunica/types';
import { UnboundVariableError } from '@comunica/utils-expression-evaluator';
import { BF, DF } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { NamedAggregator } from '../lib/NamedAggregator';

function makeEvaluator(evaluate: (bindings: RDF.Bindings) => Promise<RDF.Term>): IExpressionEvaluator {
  return <IExpressionEvaluator> <unknown> { evaluate };
}

describe('NamedAggregator', () => {
  let values: RDF.Term[][];
  let aggregator: IExtensionAggregator;
  let evaluators: IExpressionEvaluator[];

  beforeEach(() => {
    values = [];
    aggregator = {
      put: jest.fn((args) => {
        values.push(args);
      }),
      result: jest.fn(() => DF.literal(String(values.length))),
    };
    evaluators = [
      makeEvaluator(async bindings => bindings.get('x')!),
      makeEvaluator(async bindings => bindings.get('y')!),
    ];
  });

  it('should put the evaluated arguments', async() => {
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    expect(values).toEqual([
      [ DF.literal('1'), DF.literal('2') ],
      [ DF.literal('1'), DF.literal('2') ],
    ]);
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('2'));
  });

  it('should put each distinct list of arguments once with distinct', async() => {
    const namedAggregator = new NamedAggregator(evaluators, true, aggregator);
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('3') ],
    ]));
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    expect(values).toEqual([
      [ DF.literal('1'), DF.literal('2') ],
      [ DF.literal('1'), DF.literal('3') ],
    ]);
  });

  it('should support an asynchronous aggregator', async() => {
    aggregator = {
      put: async(args) => {
        values.push(args);
      },
      result: async() => DF.literal(String(values.length)),
    };
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('1'));
  });

  it('should skip bindings for which an argument uses an unbound variable', async() => {
    evaluators.push(makeEvaluator(async(bindings) => {
      throw new UnboundVariableError('z', bindings);
    }));
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
    expect(aggregator.put).not.toHaveBeenCalled();
    await expect(namedAggregator.result()).resolves.toEqual(DF.literal('0'));
  });

  it('should have no result when evaluating an argument errors', async() => {
    const evaluate = jest.fn(async() => {
      throw new Error('evaluation error');
    });
    evaluators.push(makeEvaluator(evaluate));
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings());
    await namedAggregator.putBindings(BF.bindings());
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(aggregator.put).not.toHaveBeenCalled();
    await expect(namedAggregator.result()).resolves.toBeUndefined();
    expect(aggregator.result).not.toHaveBeenCalled();
  });

  it('should have no result when putting arguments errors', async() => {
    aggregator.put = () => {
      throw new Error('put error');
    };
    const namedAggregator = new NamedAggregator(evaluators, false, aggregator);
    await namedAggregator.putBindings(BF.bindings([
      [ DF.variable('x'), DF.literal('1') ],
      [ DF.variable('y'), DF.literal('2') ],
    ]));
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
