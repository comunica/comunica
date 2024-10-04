import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { AsyncExtensionFunction, GeneralSuperTypeDict, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { extractTimeZone } from './DateTimeHelpers';

export function prepareEvaluatorActionContext(orgContext: IActionContext): IActionContext {
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

  context = context.setDefault(KeysExpressionEvaluator.superTypeProvider, {
    cache: new LRUCache<string, GeneralSuperTypeDict>({ max: 1_000 }),
    discoverer: () => 'term',
  });

  return context;
}
