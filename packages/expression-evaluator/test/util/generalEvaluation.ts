import type { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { translate } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

export interface IGeneralEvaluationArg {
  bindings?: RDF.Bindings;
  expression: string;
  generalEvaluationConfig?: IActionContext;
  /**
   * Boolean pointing out if the result of async and sync evaluation should be the same.
   * Default: Check / true
   */
  expectEquality?: boolean;
  /**
   * The factory that will create the evaluator used for this evaluation.
   */
  exprEvalFactory?: ActorExpressionEvaluatorFactory;

  // TODO: remove legacyContext in *final* update (probably when preparing the EE for function bussification)
  legacyContext?: Partial<InternalEvaluator>;
}

export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    getMockEEActionContext(arg.generalEvaluationConfig),
    arg.exprEvalFactory,
  );
  return { asyncResult };
}

export async function generalErrorEvaluation(arg: IGeneralEvaluationArg):
Promise<{ asyncError: unknown; syncError?: unknown } | undefined > {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  try {
    await evaluateAsync(
      arg.expression,
      bindings,
      getMockEEActionContext(arg.generalEvaluationConfig),
      arg.exprEvalFactory,
    );
    return undefined;
  } catch (error: unknown) {
    return { asyncError: error };
  }
}

function parse(query: string) {
  const sparqlQuery = translate(query, { sparqlStar: true });
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

async function evaluateAsync(
  expr: string,
  bindings: RDF.Bindings,
  actionContext: IActionContext,
  exprEvalFactory?: ActorExpressionEvaluatorFactory,
): Promise<RDF.Term> {
  const evaluator = await (exprEvalFactory ?? getMockEEFactory())
    .run({ algExpr: parse(expr), context: actionContext });
  return evaluator.evaluate(bindings);
}
