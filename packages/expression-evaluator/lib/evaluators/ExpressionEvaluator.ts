import type { IExpressionEvaluator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions';
import type { InternalizedExpressionEvaluator } from './InternalizedExpressionEvaluator';

export class ExpressionEvaluator implements IExpressionEvaluator {
  public constructor(private readonly internalizedExpressionEvaluator: InternalizedExpressionEvaluator, private readonly expr: E.Expression) {
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.internalizedExpressionEvaluator.evaluateAsInternal(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.internalizedExpressionEvaluator.evaluateAsInternal(this.expr, mapping);
    return result.coerceEBV();
  }
}
