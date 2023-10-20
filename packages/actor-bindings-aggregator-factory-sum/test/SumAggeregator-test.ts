import { ActionContext } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import { BF, decimal, DF, float, int, makeAggregate, nonLiteral } from '@comunica/jest';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { SumAggregator } from '../lib/SumAggregator';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

describe('SampleAggregator', () => {
  let expressionEvaluatorFactory: IExpressionEvaluatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    const mediatorQueryOperation: any = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('x') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };

    expressionEvaluatorFactory = new ExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory: mediatorQueryOperation,
    });

    context = new ActionContext();
  });

  describe('non distinctive sum', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(() => {
      aggregator = new SumAggregator(
        makeAggregate('sum', false),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('10'));
    });

    it('undefined when sum is undefined', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(undefined);
    });

    it('with respect to type promotion', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'),
          DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
        BF.bindings([[ DF.variable('x'),
          DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(float('10'));
    });

    it('with accurate results', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), decimal('1.0') ]]),
        BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
        BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
        BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
        BF.bindings([[ DF.variable('x'), decimal('3.5') ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(decimal('11.1'));
    });

    it('passing a non-literal should not be accepted', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toBeUndefined();
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });
  });

  describe('distinctive sum', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(() => {
      aggregator = new SumAggregator(
        makeAggregate('sum', true),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('3'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });
  });
});
