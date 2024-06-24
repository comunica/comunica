import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { AsyncEvaluator, SyncEvaluator } from '../../lib';
import type { IAsyncEvaluatorContext, AsyncExtensionFunctionCreator } from '../../lib/evaluators/AsyncEvaluator';
import type { ISyncEvaluatorContext, SyncExtensionFunctionCreator } from '../../lib/evaluators/SyncEvaluator';

const BF = new BindingsFactory();

export type GeneralEvaluationConfig = { type: 'sync'; config: ISyncEvaluatorContext } |
{ type: 'async'; config: IAsyncEvaluatorContext };

export interface IGeneralEvaluationArg {
  bindings?: RDF.Bindings;
  expression: string;
  generalEvaluationConfig?: GeneralEvaluationConfig;
  /**
   * Boolean pointing out if the result of async and sync evaluation should be the same.
   * Default: Check / true
   */
  expectEquality?: boolean;
}

export async function generalEvaluate(arg: IGeneralEvaluationArg):
Promise<{ asyncResult: RDF.Term; syncResult?: RDF.Term }> {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  if (arg.generalEvaluationConfig?.type === 'async') {
    const asyncResult = await evaluateAsync(arg.expression, bindings, arg.generalEvaluationConfig.config);
    return { asyncResult };
  }
  const syncConfig = arg.generalEvaluationConfig?.config;
  const convertedConfig = syncConfigToAsyncConfig(syncConfig);
  const asyncResult = await evaluateAsync(
    arg.expression,
    bindings,
    convertedConfig,
  );
  const syncResult = evaluateSync(arg.expression, bindings, syncConfig);
  if (arg.expectEquality ?? arg.expectEquality === undefined) {
    expect(termToString(asyncResult)).toEqual(termToString(syncResult));
  }
  return { asyncResult, syncResult };
}

export async function generalErrorEvaluation(arg: IGeneralEvaluationArg):
Promise<{ asyncError: unknown; syncError?: unknown } | undefined > {
  const bindings: RDF.Bindings = arg.bindings ? arg.bindings : BF.bindings();
  if (arg.generalEvaluationConfig?.type === 'async') {
    try {
      await evaluateAsync(arg.expression, bindings, arg.generalEvaluationConfig.config);
      return undefined;
    } catch (error: unknown) {
      return { asyncError: error };
    }
  }
  const res: { asyncError: unknown; syncError?: unknown } = Object.create(null);
  const syncConfig = arg.generalEvaluationConfig?.config;
  try {
    await evaluateAsync(
      arg.expression,
      bindings,
      syncConfigToAsyncConfig(syncConfig),
    );
    return undefined;
  } catch (error: unknown) {
    res.asyncError = error;
  }
  try {
    evaluateSync(arg.expression, bindings, syncConfig);
    return undefined;
  } catch (error: unknown) {
    res.syncError = error;
  }
  if (arg.expectEquality ?? arg.expectEquality === undefined) {
    expect(res.asyncError).toEqual(res.syncError);
  }
  return res;
}

function syncConfigToAsyncConfig(config: ISyncEvaluatorContext | undefined): IAsyncEvaluatorContext | undefined {
  if (!config) {
    return undefined;
  }
  const asyncExists = config.exists ?
    async(e: Alg.ExistenceExpression, m: RDF.Bindings) => config.exists!(e, m) :
    undefined;
  const asyncAggregate = config.aggregate ?
    async(expression: Alg.AggregateExpression) => config.aggregate!(expression) :
    undefined;
  const asyncBnode = config.bnode ? async(input?: string) => config.bnode!(input) : undefined;
  const asyncExtensionFunctionCreator = syncCallbackWrapper(config.extensionFunctionCreator);
  return {
    ...config,
    exists: asyncExists,
    aggregate: asyncAggregate,
    bnode: asyncBnode,
    extensionFunctionCreator: asyncExtensionFunctionCreator,
  };
}

function syncCallbackWrapper(f: SyncExtensionFunctionCreator | undefined): AsyncExtensionFunctionCreator | undefined {
  if (!f) {
    return undefined;
  }
  return (namedNode: RDF.NamedNode) => {
    const func = f(namedNode);
    if (!func) {
      return;
    }
    return (args: RDF.Term[]) => Promise.resolve(func(args));
  };
}

function parse(query: string) {
  const sparqlQuery = translate(query, { sparqlStar: true });
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

function evaluateAsync(expr: string, bindings: RDF.Bindings, config?: IAsyncEvaluatorContext): Promise<RDF.Term> {
  const evaluator = new AsyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}

function evaluateSync(expr: string, bindings: RDF.Bindings, config?: ISyncEvaluatorContext): RDF.Term {
  const evaluator = new SyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}
