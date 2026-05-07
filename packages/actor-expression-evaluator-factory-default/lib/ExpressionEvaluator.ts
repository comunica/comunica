import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Expression, IActionContext, IExpressionEvaluator, TermExpression } from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { InternalEvaluator } from './InternalEvaluator';

/**
 * Evaluates SPARQL expressions against RDF bindings, implementing the {@link IExpressionEvaluator} interface.
 */
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

  /**
   * Evaluates the expression against the given bindings and returns the resulting RDF term.
   * @param mapping The variable bindings to evaluate the expression against.
   * @return The resulting RDF term.
   */
  public async evaluate(mapping: RDF.Bindings): Promise<RDF.Term> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.toRDF(this.context.getSafe(KeysInitQuery.dataFactory));
  }

  /**
   * Evaluates the expression and coerces the result to an effective boolean value.
   * @param mapping The variable bindings to evaluate the expression against.
   * @return The effective boolean value of the expression result.
   */
  public async evaluateAsEBV(mapping: RDF.Bindings): Promise<boolean> {
    const result = await this.internalEvaluator.evaluatorExpressionEvaluation(this.expr, mapping);
    return result.coerceEBV();
  }

  /**
   * Evaluates the expression and returns the result as an internal term expression.
   * @param mapping The variable bindings to evaluate the expression against.
   * @return The resulting internal term expression.
   */
  public evaluateAsEvaluatorExpression(mapping: RDF.Bindings): Promise<TermExpression> {
    return this.evaluatorExpressionEvaluation(this.expr, mapping);
  }

  /**
   * Evaluates an arbitrary expression against the given bindings using the internal evaluator.
   * @param expr The expression to evaluate.
   * @param mapping The variable bindings to evaluate the expression against.
   * @return The resulting internal term expression.
   */
  public evaluatorExpressionEvaluation(expr: Expression, mapping: RDF.Bindings): Promise<TermExpression> {
    return this.internalEvaluator.evaluatorExpressionEvaluation(expr, mapping);
  }
}
