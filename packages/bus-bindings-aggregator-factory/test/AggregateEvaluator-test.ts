import { BindingsFactory } from '@comunica/bindings-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import { getMockEEActionContext, getMockEEFactory, int, makeAggregate } from '@comunica/jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { AggregateEvaluator } from '../lib';

const DF = new DataFactory();
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

describe('aggregate evaluator', () => {
  it('handles errors using async evaluations', async() => {
    const temp = await getMockEEFactory().run({
      algExpr: makeAggregate('sum').expression,
      context: getMockEEActionContext(),
    });
    let first = true;
    temp.evaluate = async() => {
      if (first) {
        first = false;
        throw new Error('We only want the first to succeed');
      }
      return int('1');
    };
    const evaluator: AggregateEvaluator = new EmptyEvaluator(temp, false);
    await Promise.all([ evaluator.putBindings(BF.bindings()), evaluator.putBindings(BF.bindings()) ]);
    await expect(evaluator.result()).resolves.toBeUndefined();
  });
});
