import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockEEActionContext, getMockEEFactory } from './helpers';
import type * as RDF from '@rdfjs/types';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser as SparqlParser } from '@traqula/parser-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';

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
  toAlgebraParse?: (query: string) => Algebra.Operation;
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
    arg.toAlgebraParse,
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
      arg.toAlgebraParse,
    );
    return undefined;
  } catch (error: unknown) {
    return { asyncError: error };
  }
}

const parser = new SparqlParser();
function parse(query: string, toAlgebraParse?: (query: string) => Algebra.Operation) {
  let sparqlQuery: Algebra.Project;
  if (toAlgebraParse === undefined) {
    const parsedSyntax = parser.parse(query);
    sparqlQuery = <Algebra.Project> toAlgebra(parsedSyntax);
  } else {
    sparqlQuery = <Algebra.Project> toAlgebraParse(query);
  }
  // Extract filter expression from complete query
  return (<Algebra.Filter> sparqlQuery.input).expression;
}

async function evaluateAsync(
  expr: string,
  bindings: RDF.Bindings,
  actionContext: IActionContext,
  exprEvalFactory?: ActorExpressionEvaluatorFactory,
  toAlgebraParse?: (query: string) => Algebra.Operation,
): Promise<RDF.Term> {
  const evaluator = await (exprEvalFactory ?? getMockEEFactory())
    .run({ algExpr: parse(expr, toAlgebraParse), context: actionContext }, undefined);
  return evaluator.evaluate(bindings);
}
