import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, Expression, IActionContext, TermExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as Eval from '@comunica/utils-expression-evaluator';
import { getSafeBindings, materializeOperation } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { AlgebraTransformer } from './AlgebraTransformer';

/**
 * This class provides evaluation functionality to already transformed expressions.
 */
export class InternalEvaluator {
  public readonly transformer: AlgebraTransformer;

  private readonly subEvaluators:
  Record<ExpressionType, (expr: Expression, mapping: RDF.Bindings) => Promise<Eval.Term> | Eval.Term> =
      {
        [ExpressionType.Term]: (expr, _mapping) => this.term(<Eval.Term> expr),
        [ExpressionType.Variable]: (expr, mapping) => this.variable(<Eval.Variable> expr, mapping),
        [ExpressionType.Operator]: (expr, mapping) => this.evalFunction(<Eval.Operator> expr, mapping),
        [ExpressionType.Existence]: (expr, mapping) => this.evalExistence(<Eval.Existence> expr, mapping),
        [ExpressionType.Aggregate]: (_expr, _mapping) => this.evalAggregate(),
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

  public async evaluatorExpressionEvaluation(expr: Expression, mapping: RDF.Bindings): Promise<TermExpression> {
    const evaluator = this.subEvaluators[expr.expressionType];
    return evaluator.bind(this)(expr, mapping);
  }

  private term(expr: Eval.Term): Eval.Term {
    return expr;
  }

  private variable(expr: Eval.Variable, mapping: RDF.Bindings): Eval.Term {
    const term = mapping.get(Eval.expressionToVar(this.context.getSafe(KeysInitQuery.dataFactory), expr));
    if (!term) {
      throw new Eval.UnboundVariableError(expr.name, mapping);
    }
    return this.transformer.transformRDFTermUnsafe(term);
  }

  private async evalFunction(expr: Eval.Operator, mapping: RDF.Bindings):
  Promise<Eval.Term> {
    return expr.apply({
      args: expr.args,
      mapping,
      exprEval: this,
    });
  }

  private async evalExistence(expr: Eval.Existence, mapping: RDF.Bindings): Promise<Eval.Term> {
    const dataFactory: ComunicaDataFactory = this.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const operation = materializeOperation(expr.expression.input, mapping, algebraFactory, this.bindingsFactory);

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context: this.context });
    const output = getSafeBindings(outputRaw);

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
      .then((exists: boolean) => new Eval.BooleanLiteral(exists));
  }

  private evalAggregate(): never {
    throw new Eval.NoAggregator();
  }
}
