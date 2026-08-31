import type { ComunicaDataFactory, IExpressionEvaluator } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  getMockEEActionContext,
  getMockEEFactory,
  termInt,
  makeAggregate,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { describe, expect, it } from 'vitest';
import { AggregateEvaluator } from '../lib';

const DF = <ComunicaDataFactory> new DataFactory();
const BF = new BindingsFactory(DF);

class EmptyEvaluator extends AggregateEvaluator {
  public constructor(evaluator: IExpressionEvaluator, distinct: boolean, throwError = false) {
    super(evaluator, distinct, throwError);
  }

  public putTerm(_: RDF.Term): void {
    // Empty
  }

  protected termResult(): RDF.Term | undefined {
    return undefined;
  }
}

class RecordingEvaluator extends AggregateEvaluator {
  private lastTerm: RDF.Term | undefined;

  public constructor(evaluator: IExpressionEvaluator, distinct: boolean, throwError = false) {
    super(evaluator, distinct, throwError);
  }

  public putTerm(term: RDF.Term): void {
    this.lastTerm = term;
  }

  protected termResult(): RDF.Term | undefined {
    return this.lastTerm;
  }
}

describe('aggregate evaluator', () => {
  it('handles errors using async evaluations', async() => {
    const temp = await getMockEEFactory().run({
      algExpr: makeAggregate('sum').expression,
      context: getMockEEActionContext(),
    }, undefined);
    let first = true;
    temp.evaluate = async() => {
      if (first) {
        first = false;
        throw new Error('We only want the first to succeed');
      }
      return termInt('1');
    };
    const evaluator: AggregateEvaluator = new EmptyEvaluator(temp, false);
    await Promise.all([ evaluator.putBindings(BF.bindings()), evaluator.putBindings(BF.bindings()) ]);
    await expect(evaluator.result()).resolves.toBeUndefined();
  });

  it('ignores bindings that throw an UnboundVariableError and keeps aggregating', async() => {
    const temp = await getMockEEFactory().run({
      algExpr: makeAggregate('sum').expression,
      context: getMockEEActionContext(),
    }, undefined);
    let callCount = 0;
    temp.evaluate = async(bindings: RDF.Bindings) => {
      callCount++;
      if (callCount === 1) {
        // The aggregate variable is unbound for this particular binding: per spec, it should be skipped.
        throw new Eval.UnboundVariableError('x', bindings);
      }
      return termInt('1');
    };
    const evaluator: AggregateEvaluator = new RecordingEvaluator(temp, false);
    await evaluator.putBindings(BF.bindings());
    await evaluator.putBindings(BF.bindings());
    // If the UnboundVariableError had incorrectly been treated as a fatal error,
    // the evaluator would have stopped processing and result() would resolve to undefined.
    await expect(evaluator.result()).resolves.toEqual(termInt('1'));
  });
});
