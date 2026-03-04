import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser as SparqlParser } from '@traqula/parser-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';
import { getMockEEActionContext, getMockEEFactory } from './helpers';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

export interface IGeneralEvaluationArg {
  bindings?: RDF.Bindings;
  expression: string;
  generalEvaluationConfig?: IActionContext;
  /**
   * The factory that will create the evaluator used for this evaluation.
   */
  exprEvalFactory?: ActorExpressionEvaluatorFactory;
}

export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    new ActionContext({
      [KeysInitQuery.queryTimestamp.name]: new Date(Date.now()),
      [KeysInitQuery.functionArgumentsCache.name]: {},
      [KeysInitQuery.dataFactory.name]: DF,
    }).merge(arg.generalEvaluationConfig ?? new ActionContext()),
    arg.exprEvalFactory,
  );
  return { asyncResult };
}

export async function generalErrorEvaluation(arg: IGeneralEvaluationArg):
Promise<{ asyncError: unknown; syncError?: unknown } | undefined> {
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

const parser = new SparqlParser({
  lexerConfig: {
    positionTracking: 'full',
  },
});
function parse(query: string) {
  const parsedSyntax = parser.parse(query);
  const sparqlQuery = <Algebra.Project> toAlgebra(parsedSyntax);
  // Extract filter expression from complete query
  return (<Algebra.Filter> sparqlQuery.input).expression;
}

async function evaluateAsync(
  expr: string,
  bindings: RDF.Bindings,
  actionContext: IActionContext,
  exprEvalFactory?: ActorExpressionEvaluatorFactory,
): Promise<RDF.Term> {
  const evaluator = await (exprEvalFactory ?? getMockEEFactory())
    .run({ algExpr: parse(expr), context: actionContext }, undefined);
  return evaluator.evaluate(bindings);
}
