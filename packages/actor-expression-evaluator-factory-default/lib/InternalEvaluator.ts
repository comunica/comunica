import type { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation, materializeOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import * as Eval from '@comunica/expression-evaluator';
import { expressionToVar } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Factory } from 'sparqlalgebrajs';
import { AlgebraTransformer } from './AlgebraTransformer';

/**
 * This class provides evaluation functionality to already transformed expressions.
 */
export class InternalEvaluator {
  public readonly transformer: AlgebraTransformer;

  private readonly subEvaluators:
  Record<Eval.ExpressionType, (expr: Eval.Expression, mapping: RDF.Bindings) => Promise<Eval.Term> | Eval.Term> =
      {
        [Eval.ExpressionType.Term]: (expr, _mapping) => this.term(<Eval.Term> expr),
        [Eval.ExpressionType.Variable]: (expr, mapping) => this.variable(<Eval.Variable> expr, mapping),
        [Eval.ExpressionType.Operator]: (expr, mapping) => this.evalFunction(<Eval.Operator> expr, mapping),
        [Eval.ExpressionType.Existence]: (expr, mapping) => this.evalExistence(<Eval.Existence> expr, mapping),
        [Eval.ExpressionType.Aggregate]: (_expr, _mapping) => this.evalAggregate(),
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

  public async evaluatorExpressionEvaluation(expr: Eval.Expression, mapping: RDF.Bindings): Promise<Eval.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    return evaluator.bind(this)(expr, mapping);
  }

  private term(expr: Eval.Term): Eval.Term {
    return expr;
  }

  private variable(expr: Eval.Variable, mapping: RDF.Bindings): Eval.Term {
    const term = mapping.get(expressionToVar(this.context.getSafe(KeysInitQuery.dataFactory), expr));
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
    const algebraFactory = new Factory(dataFactory);
    const operation = materializeOperation(expr.expression.input, mapping, algebraFactory, this.bindingsFactory);

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
      .then((exists: boolean) => new Eval.BooleanLiteral(exists));
  }

  private evalAggregate(): never {
    throw new Eval.NoAggregator();
  }
}
