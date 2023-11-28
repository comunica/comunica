import { BindingsFactory } from '@comunica/bindings-factory';
import { getMockEEFactory } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { translate } from 'sparqlalgebrajs';
import type { InternalEvaluator } from '../../lib/evaluators/InternalEvaluator';
import { getMockEEActionContext } from './utils';

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

  // TODO: remove legacyContext in *final* update (probably when preparing the EE for function bussification)
  legacyContext?: Partial<InternalEvaluator>;
}

export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    arg.generalEvaluationConfig || getMockEEActionContext(),
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
      arg.generalEvaluationConfig || getMockEEActionContext(),
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

async function evaluateAsync(expr: string, bindings: RDF.Bindings, actionContext: IActionContext): Promise<RDF.Term> {
  const evaluator = await getMockEEFactory()
    .createEvaluator(parse(expr), actionContext);
  return evaluator.evaluate(bindings);
}
