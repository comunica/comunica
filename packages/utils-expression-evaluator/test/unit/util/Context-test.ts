import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { prepareEvaluatorActionContext } from '../../../lib';

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
});
