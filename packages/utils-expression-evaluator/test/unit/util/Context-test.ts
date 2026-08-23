import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { createSuperTypeProvider, prepareEvaluatorActionContext } from '../../../lib';

const DF = new DataFactory();

describe('prepareEvaluatorActionContext', () => {
  const baseContext = new ActionContext({
    [KeysInitQuery.queryTimestamp.name]: new Date(Date.now()),
    [KeysInitQuery.dataFactory.name]: DF,
    [KeysInitQuery.functionArgumentsCache.name]: {},
  });

  it('creates a super type provider when the context has none', () => {
    const prepared = prepareEvaluatorActionContext(baseContext);
    const provider = prepared.getSafe(KeysExpressionEvaluator.superTypeProvider);
    expect(provider.cache).toBeDefined();
    expect(provider.discoverer('http://example.org/unknown')).toBe('term');
  });

  it('reuses the given default super type provider', () => {
    const provider = createSuperTypeProvider();
    const prepared = prepareEvaluatorActionContext(baseContext, provider);
    expect(prepared.getSafe(KeysExpressionEvaluator.superTypeProvider)).toBe(provider);
  });

  it('keeps a super type provider that is already in the context', () => {
    const provider = createSuperTypeProvider();
    const prepared = prepareEvaluatorActionContext(
      baseContext.set(KeysExpressionEvaluator.superTypeProvider, provider),
      createSuperTypeProvider(),
    );
    expect(prepared.getSafe(KeysExpressionEvaluator.superTypeProvider)).toBe(provider);
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
});
