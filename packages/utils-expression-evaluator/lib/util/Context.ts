import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type {
  AsyncExtensionFunction,
  GeneralSuperTypeDict,
  IActionContext,
  ISuperTypeProvider,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { extractTimeZone } from './DateTimeHelpers';

/**
 * Prepare an action context for use by an expression evaluator.
 * @param orgContext The context to prepare.
 * @param defaultSuperTypeProvider A super type provider to fall back on if the context does not define one.
 *                                 Since this holds a (pure) type cache, callers are encouraged to pass a
 *                                 long-lived instance instead of letting one be created per evaluator.
 */
/**
 * Create a super type provider with an empty type cache.
 */
export function createSuperTypeProvider(): ISuperTypeProvider {
  return {
    cache: new LRUCache<string, GeneralSuperTypeDict>({ max: 1_000 }),
    discoverer: () => 'term',
  };
}

export function prepareEvaluatorActionContext(
  orgContext: IActionContext,
  defaultSuperTypeProvider?: ISuperTypeProvider,
): IActionContext {
  let context = orgContext;

  // Handle two variants of providing extension functions
  if (context.has(KeysInitQuery.extensionFunctionCreator) && context.has(KeysInitQuery.extensionFunctions)) {
    throw new Error('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
  }
  if (context.has(KeysInitQuery.extensionFunctionCreator)) {
    context = context.set(
      KeysExpressionEvaluator.extensionFunctionCreator,
      context.get(KeysInitQuery.extensionFunctionCreator),
    );
  } else if (context.has(KeysInitQuery.extensionFunctions)) {
    const extensionFunctions: Record<string, AsyncExtensionFunction> = context.getSafe(
      KeysInitQuery.extensionFunctions,
    );
    context = context.set(
      KeysExpressionEvaluator.extensionFunctionCreator,
      async(functionNamedNode: RDF.NamedNode) => extensionFunctions[functionNamedNode.value],
    );
  } else {
    // eslint-disable-next-line unicorn/no-useless-undefined
    context = context.setDefault(KeysExpressionEvaluator.extensionFunctionCreator, async() => undefined);
  }

  context = context.setDefault(
    KeysExpressionEvaluator.defaultTimeZone,
    extractTimeZone(context.getSafe(KeysInitQuery.queryTimestamp)),
  );

  // This is deliberately not a `setDefault` call: its argument would be evaluated on every invocation,
  // allocating (and immediately discarding) a 1000-entry LRU cache even when a provider is already present.
  // This function runs once per created expression evaluator, of which there is one per aggregator,
  // so that adds up quickly on aggregation-heavy queries.
  if (!context.has(KeysExpressionEvaluator.superTypeProvider)) {
    context = context.set(
      KeysExpressionEvaluator.superTypeProvider,
      defaultSuperTypeProvider ?? createSuperTypeProvider(),
    );
  }

  return context;
}
