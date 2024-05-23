import type { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation, materializeOperation } from '@comunica/bus-query-operation';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import { expressionToVar } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AlgebraTransformer } from './AlgebraTransformer';

/**
 * This class provides evaluation functionality to already transformed expressions.
 */
export class InternalEvaluator {
  public readonly transformer: AlgebraTransformer;

  private readonly subEvaluators:
  Record<E.ExpressionType, (expr: E.Expression, mapping: RDF.Bindings) => Promise<E.Term> | E.Term> =
      {
        [E.ExpressionType.Term]: (expr, _mapping) => this.term(<E.Term> expr),
        [E.ExpressionType.Variable]: (expr, mapping) => this.variable(<E.Variable> expr, mapping),
        [E.ExpressionType.Operator]: (expr, mapping) => this.evalFunction(<E.Operator> expr, mapping),
        [E.ExpressionType.SpecialOperator]: (expr, mapping) => this.evalFunction(<E.Operator> expr, mapping),
        [E.ExpressionType.Named]: (expr, mapping) => this.evalFunction(<E.Operator> expr, mapping),
        [E.ExpressionType.Existence]: (expr, mapping) => this.evalExistence(<E.Existence> expr, mapping),
        [E.ExpressionType.Aggregate]: (_expr, _mapping) => this.evalAggregate(),
      };

  public constructor(
    public readonly context: IActionContext,
    mediatorFunctionFactory: MediatorFunctionFactory,
    private readonly mediatorQueryOperation: MediatorQueryOperation,
    private readonly bindingsFactory: BindingsFactory,
  ) {
    this.transformer = new AlgebraTransformer(
      context,
      mediatorFunctionFactory,
    );
  }

  public async evaluatorExpressionEvaluation(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    return evaluator.bind(this)(expr, mapping);
  }

  private term(expr: E.Term): E.Term {
    return expr;
  }

  private variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.transformer.transformRDFTermUnsafe(term);
  }

  private async evalFunction(expr: E.Operator | E.SpecialOperator | E.Named, mapping: RDF.Bindings):
  Promise<E.Term> {
    return expr.apply({
      args: expr.args,
      mapping,
      exprEval: this,
    });
  }

  private async evalExistence(expr: E.Existence, mapping: RDF.Bindings): Promise<E.Term> {
    const operation = materializeOperation(expr.expression.input, mapping, this.bindingsFactory);

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context: this.context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    return await new Promise<boolean>(
      (resolve, reject) => {
        output.bindingsStream.on('end', () => {
          resolve(false);
        });

        output.bindingsStream.on('error', reject);

        output.bindingsStream.on('data', () => {
          output.bindingsStream.close();
          resolve(true);
        });
      },
    )
      .then((exists: boolean) => expr.expression.not ? !exists : exists)
      .then((exists: boolean) => new E.BooleanLiteral(exists));
  }

  private evalAggregate(): never {
    throw new Err.NoAggregator();
  }
}
