import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { ExpressionEngine } from '../lib/ExpressionEngine';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

const XSD_INTEGER = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');

describe('ExpressionEngine', () => {
  let engine: ExpressionEngine;

  beforeEach(() => {
    engine = new ExpressionEngine();
  });

  describe('createEvaluator', () => {
    it('evaluates an expression to a term.', async() => {
      const evaluator = await engine.createEvaluator(AF.createOperatorExpression('ucase', [
        AF.createTermExpression(DF.variable('s')),
      ]));
      await expect(evaluator.evaluate(BF.fromRecord({ s: DF.literal('abc') })))
        .resolves.toEqual(DF.literal('ABC'));
    });

    it('evaluates an expression to an effective boolean value.', async() => {
      const evaluator = await engine.createEvaluator(AF.createOperatorExpression('>', [
        AF.createTermExpression(DF.variable('x')),
        AF.createTermExpression(DF.literal('1', XSD_INTEGER)),
      ]));
      await expect(evaluator.evaluateAsEBV(BF.fromRecord({ x: DF.literal('2', XSD_INTEGER) })))
        .resolves.toBe(true);
      await expect(evaluator.evaluateAsEBV(BF.fromRecord({ x: DF.literal('0', XSD_INTEGER) })))
        .resolves.toBe(false);
    });

    it('honours the provided context.', async() => {
      const evaluator = await engine.createEvaluator(
        AF.createOperatorExpression('now', []),
        new ActionContext({ [KeysInitQuery.queryTimestamp.name]: new Date(1_234_567_890_000) }),
      );
      await expect(evaluator.evaluate(BF.bindings())).resolves.toEqual(DF.literal(
        '2009-02-13T23:31:30Z',
        DF.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'),
      ));
    });
  });

  describe('createTermComparator', () => {
    it('orders terms.', async() => {
      const comparator = await engine.createTermComparator();
      expect(comparator.orderTypes(DF.literal('1', XSD_INTEGER), DF.literal('2', XSD_INTEGER))).toBe(-1);
      expect(comparator.orderTypes(DF.literal('2', XSD_INTEGER), DF.literal('1', XSD_INTEGER))).toBe(1);
      expect(comparator.orderTypes(DF.literal('1', XSD_INTEGER), DF.literal('1', XSD_INTEGER))).toBe(0);
    });

    it('honours the provided context.', async() => {
      const comparator = await engine.createTermComparator(
        new ActionContext({ [KeysExpressionEvaluator.fullTermComparison.name]: true }),
      );
      expect(comparator.orderTypes(DF.blankNode('a'), DF.namedNode('ex:a'))).toBe(-1);
    });
  });

  describe('createAggregator', () => {
    it('aggregates bindings.', async() => {
      const aggregator = await engine.createAggregator(AF.createAggregateExpression(
        'sum',
        AF.createTermExpression(DF.variable('x')),
        false,
      ));
      await aggregator.putBindings(BF.fromRecord({ x: DF.literal('1', XSD_INTEGER) }));
      await aggregator.putBindings(BF.fromRecord({ x: DF.literal('2', XSD_INTEGER) }));
      await expect(aggregator.result()).resolves.toEqual(DF.literal('3', XSD_INTEGER));
    });
  });
});
