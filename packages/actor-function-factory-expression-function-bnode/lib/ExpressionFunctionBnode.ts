import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type {
  Expression,
  IEvalContext,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  BlankNode,
  declare,
  InvalidArgumentTypes,
  SparqlOperator,
} from '@comunica/expression-evaluator';
import { BlankNodeBindingsScoped } from '@comunica/utils-data-factory';

/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
export class ExpressionFunctionBnode extends ExpressionFunctionBase {
  /**
   * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
   */
  private static readonly bnodeTree = declare(SparqlOperator.BNODE).onString1(() => arg => arg).collect();

  /**
   * A counter that keeps track blank node generated through BNODE() SPARQL
   * expressions.
   */
  private static bnodeCounter = 0;

  public constructor() {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.BNODE,
      apply: async(context: IEvalContext): Promise<TermExpression> => {
        const { args, mapping, exprEval } = context;
        const input = args.length === 1 ?
          await exprEval.evaluatorExpressionEvaluation(args[0], mapping) :
          undefined;

        let strInput: string | undefined;
        if (input) {
          const operation = ExpressionFunctionBnode.bnodeTree.search(
            [ input ],
            exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
            exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
          );
          if (!operation) {
            throw new InvalidArgumentTypes(args, SparqlOperator.BNODE);
          }
          strInput = operation(exprEval)([ input ]).str();
        }

        const bnode = new BlankNodeBindingsScoped(strInput ?? `BNODE_${ExpressionFunctionBnode.bnodeCounter++}`);
        return new BlankNode(bnode);
      },
    });
  }

  public override checkArity(args: Expression[]): boolean {
    return args.length === 0 || args.length === 1;
  }
}
