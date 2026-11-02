import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { prepareEvaluatorActionContext } from '../../../lib';
import { defaultSuperTypeProvider } from '../../../lib/util/Context';

const DF = new DataFactory();

describe('prepareEvaluatorActionContext', () => {
  const baseContext = new ActionContext({
    [KeysInitQuery.queryTimestamp.name]: new Date(Date.now()),
    [KeysInitQuery.dataFactory.name]: DF,
    [KeysInitQuery.functionArgumentsCache.name]: {},
  });

  it('sets extensionFunctionCreator from extensionFunctions map', async() => {
    const myFunc = async(_args: any[]) => DF.literal('result');
    const extensionFunctions = { 'https://example.org/myFunc': myFunc };

    const prepared = prepareEvaluatorActionContext(baseContext.merge(new ActionContext({
      [KeysInitQuery.extensionFunctions.name]: extensionFunctions,
    })));

    const creator = prepared.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const fn = await creator(DF.namedNode('https://example.org/myFunc'));
    expect(fn).toBe(myFunc);
  });

  it('sets extensionFunctionCreator to undefined for unknown functions', async() => {
    const extensionFunctions = {};
    const prepared = prepareEvaluatorActionContext(baseContext.merge(new ActionContext({
      [KeysInitQuery.extensionFunctions.name]: extensionFunctions,
    })));

    const creator = prepared.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
    const fn = await creator(DF.namedNode('https://example.org/unknown'));
    expect(fn).toBeUndefined();
  });

  it('throws when both extensionFunctionCreator and extensionFunctions are set', () => {
    expect(() => prepareEvaluatorActionContext(baseContext.merge(new ActionContext({
      [KeysInitQuery.extensionFunctionCreator.name]: async() => async() => undefined,
      [KeysInitQuery.extensionFunctions.name]: {},
    })))).toThrow('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
  });

  it('shares the default super type provider across contexts', () => {
    const first = prepareEvaluatorActionContext(baseContext);
    const second = prepareEvaluatorActionContext(baseContext);
    expect(first.getSafe(KeysExpressionEvaluator.superTypeProvider)).toBe(defaultSuperTypeProvider);
    expect(second.getSafe(KeysExpressionEvaluator.superTypeProvider)).toBe(defaultSuperTypeProvider);
  });

  it('only discovers built-in types with the default super type provider', () => {
    expect(defaultSuperTypeProvider.discoverer('https://example.org/type')).toBe('term');
  });

  it('keeps a given super type provider', () => {
    const superTypeProvider = { cache: defaultSuperTypeProvider.cache, discoverer: () => 'term' };
    const prepared = prepareEvaluatorActionContext(baseContext.merge(new ActionContext({
      [KeysExpressionEvaluator.superTypeProvider.name]: superTypeProvider,
    })));
    expect(prepared.getSafe(KeysExpressionEvaluator.superTypeProvider)).toBe(superTypeProvider);
  });
});
