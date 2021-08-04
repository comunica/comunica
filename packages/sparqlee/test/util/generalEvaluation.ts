import * as RDF from 'rdf-js';
import {Bindings} from '../../lib/Types';
import {AsyncEvaluator, AsyncEvaluatorConfig, AsyncExtensionFunctionCreator} from '../../lib/evaluators/AsyncEvaluator';
import {SyncEvaluator, SyncEvaluatorConfig, SyncExtensionFunctionCreator} from '../../lib/evaluators/SyncEvaluator';
import {Algebra as Alg, translate} from 'sparqlalgebrajs';
import {termToString} from 'rdf-string';


export type GeneralEvaluationConfig = {type: 'sync', config: SyncEvaluatorConfig} |
  {type: 'async', config: AsyncEvaluatorConfig};
export interface GeneralEvaluationArg {
  bindings?: Bindings;
  expression?: string;
  generalEvaluationConfig?: GeneralEvaluationConfig;
  expectEquality?: boolean;
}
export async function generalEvaluate(arg: GeneralEvaluationArg): Promise<{ asyncResult: RDF.Term, syncResult?: RDF.Term }> {
  const bindings: Bindings = arg.bindings ? arg.bindings : Bindings({});
  if (arg.generalEvaluationConfig?.type === 'async') {
    return { asyncResult: await evaluateAsync(arg.expression, bindings, arg.generalEvaluationConfig.config) };
  }else {
    const asyncResult = await evaluateAsync(arg.expression,  bindings,
      syncConfigToAsyncConfig(arg.generalEvaluationConfig?.config));
    const syncResult = evaluateSync(arg.expression, bindings, arg.generalEvaluationConfig?.config);
    if (arg.expectEquality) {
      expect(termToString(asyncResult)).toEqual(termToString(syncResult));
    }
    return { asyncResult };
  }
}
function syncConfigToAsyncConfig(config: SyncEvaluatorConfig | undefined): AsyncEvaluatorConfig | undefined {
  if (!config) {
    return undefined;
  }
  const {now, baseIRI, exists, aggregate, bnode, extensionFunctionCreator} = config;
  const asyncExists = exists ? async(e: Alg.ExistenceExpression, m: Bindings) => exists(e, m) : undefined;
  const asyncAggregate =  aggregate ? async(expression: Alg.AggregateExpression) => aggregate(expression) : undefined;
  const asyncBnode = bnode ? async(input?: string) => bnode(input) : undefined;
  const asyncExtensionFunctionCreator = syncCallbackWrapper(extensionFunctionCreator);
  return {
    now, baseIRI, exists: asyncExists, aggregate: asyncAggregate, bnode: asyncBnode,
    extensionFunctionCreator: asyncExtensionFunctionCreator
  };
}

function syncCallbackWrapper(f: SyncExtensionFunctionCreator | undefined): AsyncExtensionFunctionCreator | undefined {
  if (!f) return undefined;
  return (namedNode: RDF.NamedNode) => async(args: RDF.Term[]) => f(namedNode)(args);
}

function parse(query: string) {
  const sparqlQuery = translate(query);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

function evaluateAsync(expr: string, bindings: Bindings, config?: AsyncEvaluatorConfig): Promise<RDF.Term> {
  const evaluator = new AsyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}

function evaluateSync(expr: string, bindings: Bindings, config?: SyncEvaluatorConfig): RDF.Term {
  const evaluator = new SyncEvaluator(parse(expr), config);
  return evaluator.evaluate(bindings);
}
