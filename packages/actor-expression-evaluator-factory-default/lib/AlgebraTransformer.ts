import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { Expression, IActionContext, OperatorExpression } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraTransformer } from '@comunica/utils-algebra';
import * as ExprEval from '@comunica/utils-expression-evaluator';

const expressionTransformer = algebraTransformer<'unsafe', Expression>({ continue: false, copy: false });

/**
 * The context of an expression whose arguments have to be converted before it can be built.
 * Shared by the operator and named expressions: the arguments are traversed, while the `name` of a named
 * expression is a term that is read as-is.
 */
const argumentConvertingContext = { continue: true, copy: true, ignoreKeys: new Set([ 'name', 'metadata' ]) };

export class AlgebraTransformer extends ExprEval.TermTransformer {
  private readonly AF = new AlgebraFactory();
  public constructor(
    private readonly context: IActionContext,
    private readonly mediatorFunctionFactory: MediatorFunctionFactory,
  ) {
    super(context.getSafe(KeysExpressionEvaluator.superTypeProvider));
  }

  public async transformAlgebra(expr: Algebra.Expression): Promise<Expression> {
    return await expressionTransformer.transformNodeSpecificAsync(expr, {
      // Reached by an expression whose subType has no callback below, which is one this cannot convert.
      [Algebra.Types.EXPRESSION]: { transform: (expression) => {
        throw new Error(`Expression of type ${expression.subType} cannot be converted into internal representation of expression.`);
      } },
    }, {
      [Algebra.Types.EXPRESSION]: {
        [Algebra.ExpressionTypes.TERM]: { transform: term => this.transformTermExpression(term) },
        [Algebra.ExpressionTypes.OPERATOR]: {
          preVisitor: () => argumentConvertingContext,
          transform: (copy: { args: unknown }, orig) => this.buildOperator(
            orig.operator.toLowerCase(),
            orig,
            <Expression[]> copy.args,
          ),
        },
        [Algebra.ExpressionTypes.NAMED]: {
          preVisitor: () => argumentConvertingContext,
          transform: (copy: { args: unknown }, orig) => this.buildOperator(
            orig.name.value,
            orig,
            <Expression[]> copy.args,
          ),
        },
        [Algebra.ExpressionTypes.EXISTENCE]: {
          transform: existence => AlgebraTransformer.transformExistence(existence),
        },
        [Algebra.ExpressionTypes.AGGREGATE]: {
          transform: aggregate => AlgebraTransformer.transformAggregate(aggregate),
        },
        [Algebra.ExpressionTypes.WILDCARD]: {
          transform: wildcard => AlgebraTransformer.transformWildcard(wildcard),
        },
      },
    });
  }

  private static transformWildcard(_term: Algebra.WildcardExpression): Expression {
    return new ExprEval.NamedNode('*');
  }

  private async transformTermExpression(expr: Algebra.TermExpression): Promise<Expression> {
    // A triple term is actually not a term since it itself can contain
    // variables thereby having the properties of an operator, we therefore map it to the triple operator here.
    // Not that this is needed because the EE has a shortcut for terms and sees them as distinct from operators.
    if (expr.term.termType === 'Quad') {
      const args = [
        this.AF.createTermExpression(expr.term.subject),
        this.AF.createTermExpression(expr.term.predicate),
        this.AF.createTermExpression(expr.term.object),
      ];
      return this.buildOperator(
        'triple',
        this.AF.createOperatorExpression('triple', args),
        await Promise.all(args.map(arg => this.transformTermExpression(arg))),
      );
    }
    return this.transformTerm(expr);
  }

  /**
   * Build the internal operator for the given expression, given its already converted arguments.
   * @param operator The name the function is resolved by.
   * @param expr The expression as algebra, which the function is resolved from.
   * @param operatorArgs The converted arguments of the expression.
   */
  private async buildOperator(
    operator: string,
    expr: Algebra.OperatorExpression | Algebra.NamedExpression,
    operatorArgs: Expression[],
  ): Promise<OperatorExpression> {
    const operatorFunc = await this.mediatorFunctionFactory.mediate({
      functionName: operator,
      arguments: expr.args,
      context: this.context,
    });
    if (!operatorFunc.checkArity(operatorArgs)) {
      throw new ExprEval.InvalidArity(operatorArgs, operator);
    }
    return new ExprEval.Operator(operator, operatorArgs, operatorFunc.apply);
  }

  public static transformAggregate(expr: Algebra.AggregateExpression): ExprEval.Aggregate {
    const name = expr.aggregator;
    return new ExprEval.Aggregate(name, expr);
  }

  public static transformExistence(expr: Algebra.ExistenceExpression): ExprEval.Existence {
    return new ExprEval.Existence(expr);
  }
}
