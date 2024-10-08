import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Expression, IActionContext, IExpressionEvaluator, TermExpression } from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { InternalEvaluator } from './InternalEvaluator';

export class ExpressionEvaluator implements IExpressionEvaluator {
  private readonly internalEvaluator: InternalEvaluator;
  public constructor(
    public readonly context: IActionContext,
    public readonly expr: Expression,
    public readonly mediatorFunctionFactory: MediatorFunctionFactory,
    public readonly mediatorQueryOperation: MediatorQueryOperation,
    public readonly bindingsFactory: BindingsFactory,
  ) {
    this.internalEvaluator =
      new InternalEvaluator(context, mediatorFunctionFactory, mediatorQueryOperation, bindingsFactory);
  }

  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.toRDF(this.context.getSafe(KeysInitQuery.dataFactory));
  }

  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsEvaluatorExpression(mapping: RDF.Bindings): Promise<Expression> {
    return this.evaluatorExpressionEvaluation(this.expr, mapping);
  }

  public evaluatorExpressionEvaluation(expr: Expression, mapping: RDF.Bindings): Promise<TermExpression> {
    return this.internalEvaluator.evaluatorExpressionEvaluation(expr, mapping);
  }
}
