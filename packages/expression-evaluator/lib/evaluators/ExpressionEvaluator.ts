import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions';
import type { IExpressionEvaluator } from '../types';
import { InternalEvaluator } from './InternalEvaluator';

export class ExpressionEvaluator implements IExpressionEvaluator {
  private readonly internalEvaluator: InternalEvaluator;
  public constructor(
    public readonly context: IActionContext,
    public readonly expr: E.Expression,
  ) {
    this.internalEvaluator = new InternalEvaluator(context);
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.internalEvaluator.internalEvaluation(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.internalEvaluator.internalEvaluation(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsInternal(mapping: RDF.Bindings): Promise<E.Expression> {
    return this.internalEvaluation(this.expr, mapping);
  }

  public internalEvaluation(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    return this.internalEvaluator.internalEvaluation(expr, mapping);
  }
}
