import { BindingsFactory } from '@comunica/bindings-factory';
import { getMockEEFactory } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { translate } from 'sparqlalgebrajs';
import type { MaterializedEvaluatorContext } from '../../lib/evaluators/MaterializedEvaluatorContext';
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
  legacyContext?: Partial<MaterializedEvaluatorContext>;
}

export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    arg.generalEvaluationConfig || getMockEEActionContext(),
    arg.legacyContext,
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
      arg.legacyContext,
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

async function evaluateAsync(expr: string, bindings: RDF.Bindings, actionContext: IActionContext,
  legacyContext?: Partial<MaterializedEvaluatorContext>): Promise<RDF.Term> {
  const evaluator = await getMockEEFactory()
    .createEvaluator(parse(expr), actionContext, legacyContext);
  return evaluator.evaluate(bindings);
}
