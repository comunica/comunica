import type { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { InternalEvaluator } from './InternalEvaluator';

export class ExpressionEvaluator implements IExpressionEvaluator {
  private readonly internalEvaluator: InternalEvaluator;
  public constructor(
    public readonly context: IActionContext,
    public readonly expr: E.Expression,
    public readonly mediatorFunctionFactory: MediatorFunctionFactory,
    public readonly mediatorQueryOperation: MediatorQueryOperation,
    public readonly bindingsFactory: BindingsFactory,
  ) {
    this.internalEvaluator =
      new InternalEvaluator(context, mediatorFunctionFactory, mediatorQueryOperation, bindingsFactory);
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsEvaluatorExpression(mapping: RDF.Bindings): Promise<E.Expression> {
    return this.evaluatorExpressionEvaluation(this.expr, mapping);
  }

  public evaluatorExpressionEvaluation(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    return this.internalEvaluator.evaluatorExpressionEvaluation(expr, mapping);
  }
}
