import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import { AsyncEvaluator } from '../../../lib/evaluators/AsyncEvaluator';
import { SyncEvaluator } from '../../../lib/evaluators/SyncEvaluator';
import { IntegerLiteral } from '../../../lib/expressions';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';

const DF = new DataFactory();
const BF = new BindingsFactory();
const two = DF.literal('2', DF.namedNode(DT.XSD_INTEGER));

function parse(expr: string) {
  return translate(`SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`).input.expression;
}

describe('evaluators', () => {
  describe('SyncEvaluator', () => {
    describe('evaluate', () => {
      it('is able to evaluate', () => {
        const evaluator = new SyncEvaluator(parse('1 + 1'));
        expect(evaluator.evaluate(BF.bindings())).toEqual(two);
      });

      it('has proper default extended XSD type support', () => {
        const evaluator = new SyncEvaluator(parse('1 + 1'), { enableExtendedXsdTypes: true });
        expect(evaluator.evaluate(BF.bindings())).toEqual(two);
      });

      it('has proper extended XSD type support', () => {
        const evaluator = new SyncEvaluator(parse('1 + "1"^^<http://example.com>'), { enableExtendedXsdTypes: true });
        expect(() => evaluator.evaluate(BF.bindings())).toThrow(Err.InvalidArgumentTypes);
      });
    });

    describe('evaluateAsEBV', () => {
      it('is able to evaluate to true', () => {
        const evaluator = new SyncEvaluator(parse('1 + 1'));
        expect(evaluator.evaluateAsEBV(BF.bindings())).toEqual(true);
      });

      it('is able to evaluate to false', () => {
        const evaluator = new SyncEvaluator(parse('0'));
        expect(evaluator.evaluateAsEBV(BF.bindings())).toEqual(false);
      });
    });

    describe('evaluateAsInternal', () => {
      it('is able to evaluate', () => {
        const evaluator = new SyncEvaluator(parse('1 + 1'));
        expect(evaluator.evaluateAsInternal(BF.bindings())).toEqual(new IntegerLiteral(2));
      });
    });
  });

  describe('AsyncEvaluator', () => {
    describe('evaluate', () => {
      it('is able to evaluate', async() => {
        const evaluator = new AsyncEvaluator(parse('1 + 1'));
        expect(await evaluator.evaluate(BF.bindings())).toEqual(two);
      });

      it('has proper default extended XSD type support', async() => {
        const evaluator = new AsyncEvaluator(parse('1 + 1'), { enableExtendedXsdTypes: true });
        expect(await evaluator.evaluate(BF.bindings())).toEqual(two);
      });

      it('has proper extended XSD type support', async() => {
        const evaluator = new AsyncEvaluator(parse('1 + "1"^^<http://example.com>'), { enableExtendedXsdTypes: true });
        await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
      });
    });

    describe('evaluateAsEBV', () => {
      it('is able to evaluate to true', async() => {
        const evaluator = new AsyncEvaluator(parse('1 + 1'));
        expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(true);
      });

      it('is able to evaluate to false', async() => {
        const evaluator = new AsyncEvaluator(parse('0'));
        expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(false);
      });
    });

    describe('evaluateAsInternal', () => {
      it('is able to evaluate', async() => {
        const evaluator = new AsyncEvaluator(parse('1 + 1'));
        expect(await evaluator.evaluateAsInternal(BF.bindings())).toEqual(new IntegerLiteral(2));
      });
    });
  });
});
