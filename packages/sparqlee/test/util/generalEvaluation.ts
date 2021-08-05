import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import type { IAsyncEvaluatorConfig, AsyncExtensionFunctionCreator } from '../../lib/evaluators/AsyncEvaluator';
import { AsyncEvaluator } from '../../lib/evaluators/AsyncEvaluator';
import type { ISyncEvaluatorConfig, SyncExtensionFunctionCreator } from '../../lib/evaluators/SyncEvaluator';
import { SyncEvaluator } from '../../lib/evaluators/SyncEvaluator';
import { Bindings } from '../../lib/Types';

export type GeneralEvaluationConfig = { type: 'sync'; config: ISyncEvaluatorConfig } |
{ type: 'async'; config: IAsyncEvaluatorConfig };
export interface IGeneralEvaluationArg {
  bindings?: Bindings;
  expression?: string;
  generalEvaluationConfig?: GeneralEvaluationConfig;
  expectEquality?: boolean;
}
export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: Bindings = arg.bindings ? arg.bindings : Bindings({});
  if (arg.generalEvaluationConfig?.type === 'async') {
    return { asyncResult: await evaluateAsync(arg.expression, bindings, arg.generalEvaluationConfig.config) };
  }
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    syncConfigToAsyncConfig(arg.generalEvaluationConfig?.config),
  );
  const syncResult = evaluateSync(arg.expression, bindings, arg.generalEvaluationConfig?.config);
  if (arg.expectEquality) {
    expect(termToString(asyncResult)).toEqual(termToString(syncResult));
  }
  return { asyncResult };
}
function syncConfigToAsyncConfig(config: ISyncEvaluatorConfig | undefined): IAsyncEvaluatorConfig | undefined {
  if (!config) {
    return undefined;
  }
  const { now, baseIRI, exists, aggregate, bnode, extensionFunctionCreator } = config;
  const asyncExists = exists ? async(e: Alg.ExistenceExpression, m: Bindings) => exists(e, m) : undefined;
  const asyncAggregate = aggregate ? async(expression: Alg.AggregateExpression) => aggregate(expression) : undefined;
  const asyncBnode = bnode ? async(input?: string) => bnode(input) : undefined;
  const asyncExtensionFunctionCreator = syncCallbackWrapper(extensionFunctionCreator);
  return {
    now,
    baseIRI,
    exists: asyncExists,
    aggregate: asyncAggregate,
    bnode: asyncBnode,
    extensionFunctionCreator: asyncExtensionFunctionCreator,
  };
}

function syncCallbackWrapper(f: SyncExtensionFunctionCreator | undefined): AsyncExtensionFunctionCreator | undefined {
  if (!f)
  { return undefined; }
  return (namedNode: RDF.NamedNode) => async(args: RDF.Term[]) => f(namedNode)(args);
}

function parse(query: string) {
  const sparqlQuery = translate(query);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

function evaluateAsync(expr: string, bindings: Bindings, config?: IAsyncEvaluatorConfig): Promise<RDF.Term> {
  const evaluator = new AsyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}

function evaluateSync(expr: string, bindings: Bindings, config?: ISyncEvaluatorConfig): RDF.Term {
  const evaluator = new SyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}
