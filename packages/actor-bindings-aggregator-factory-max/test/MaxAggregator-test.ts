import { createTermCompMediator } from '@comunica/actor-term-comparator-factory-expression-evaluator/test/util';
import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActionContext } from '@comunica/types';
import {
  BF,
  date,
  DF,
  termDouble,
  float,
  getMockEEActionContext,
  getMockEEFactory,
  termInt,
  makeAggregate,
  nonLiteral,
  string,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { MaxAggregator } from '../lib';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({
  expressionEvaluatorFactory,
  mediatorTermComparatorFactory,
  context,
  distinct,
  throwError,
}: {
  expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  context: IActionContext;
  distinct: boolean;
  throwError?: boolean;
}): Promise<MaxAggregator> {
  return new MaxAggregator(
    await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('max', distinct).expression,
      context,
    }, undefined),
    distinct,
    await mediatorTermComparatorFactory.mediate({ context }),
    throwError,
  );
}

describe('MaxAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    expressionEvaluatorFactory = getMockEEFactory();
    mediatorTermComparatorFactory = createTermCompMediator();

    context = getMockEEActionContext();
  });

  describe('non distinctive max', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({
        expressionEvaluatorFactory,
        mediatorTermComparatorFactory,
        context,
        distinct: false,
      });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('3') ]]),
        BF.bindings([[ DF.variable('x'), termInt('4') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('a list of string bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), string('11') ]]),
        BF.bindings([[ DF.variable('x'), string('2') ]]),
        BF.bindings([[ DF.variable('x'), string('1') ]]),
        BF.bindings([[ DF.variable('x'), string('3') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(string('3'));
    });

    it('a list of date bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), date('2010-06-21Z') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21-08:00') ]]),
        BF.bindings([[ DF.variable('x'), date('2001-07-23') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21+09:00') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(date('2010-06-21-08:00'));
    });

    it('should work with different types', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termDouble('11.0') ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termDouble('11.0'));
    });

    it('passing a non-literal should not be accepted', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('3') ]]),
      ];
      await expect(runAggregator(aggregator, input)).resolves.toBeUndefined();
    });

    it('passing a non-literal should not be accepted even in non-first place', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), termInt('3') ]]),
      ];
      await expect(runAggregator(aggregator, input)).resolves.toBeUndefined();
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toBeUndefined();
    });
  });

  describe('distinctive max', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = aggregator = await createAggregator({
        expressionEvaluatorFactory,
        mediatorTermComparatorFactory,
        context,
        distinct: true,
      });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ], [ DF.variable('y'), termInt('1') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('2'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toBeUndefined();
    });
  });

  // This describe actually tests the error handling of the base aggregator evaluator class
  describe('when we ask for throwing errors', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = aggregator = await createAggregator({
        expressionEvaluatorFactory,
        mediatorTermComparatorFactory,
        context,
        distinct: false,
        throwError: true,
      });
    });
    it('and the input is empty', async() => {
      const input: RDF.Bindings[] = [];
      await expect(runAggregator(aggregator, input)).rejects.toThrow('Empty aggregate expression');
    });

    it('and the first value errors', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
      ];
      await expect(runAggregator(aggregator, input)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });

    it('and any value in the stream errors', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
      ];
      await expect(runAggregator(aggregator, input)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });
  });
});
