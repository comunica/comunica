import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMetadataBindings, MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceServiceExecutor } from '../lib/QuerySourceServiceExecutor';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

describe('QuerySourceServiceExecutor', () => {
  let execute: jest.Mock;
  let getMetadata: jest.Mock;
  let source: QuerySourceServiceExecutor;
  let context: IActionContext;
  let body: Algebra.Operation;
  let serviceOperation: Algebra.Service;
  let bindingsS: RDF.Bindings;
  let bindingsSO: RDF.Bindings;
  const metadata = {
    state: expect.any(MetadataValidationState),
    cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
    variables: [
      { variable: DF.variable('s'), canBeUndef: true },
      { variable: DF.variable('o'), canBeUndef: true },
    ],
  };

  beforeEach(() => {
    execute = jest.fn();
    getMetadata = jest.fn();
    source = new QuerySourceServiceExecutor('urn:service', { execute }, DF, AF);
    context = new ActionContext();
    body = AF.createPattern(DF.variable('s'), DF.namedNode('urn:p'), DF.variable('o'));
    serviceOperation = AF.createService(body, DF.namedNode('urn:service'), false);
    bindingsS = BF.bindings([[ DF.variable('s'), DF.namedNode('urn:s1') ]]);
    bindingsSO = BF.bindings([
      [ DF.variable('s'), DF.namedNode('urn:s2') ],
      [ DF.variable('o'), DF.literal('o2') ],
    ]);
  });

  it('should expose its reference value', () => {
    expect(source.referenceValue).toBe('urn:service');
    expect(source.toString()).toBe('QuerySourceServiceExecutor(urn:service)');
  });

  it('should accept any operation in its selector shape', async() => {
    await expect(source.getSelectorShape()).resolves.toEqual({
      type: 'operation',
      operation: { operationType: 'wildcard' },
    });
  });

  it('should have a filter factor of 1', async() => {
    await expect(source.getFilterFactor()).resolves.toBe(1);
  });

  it('should not support quads, boolean, and void queries', async() => {
    expect(() => source.queryQuads()).toThrow('Custom SERVICE executors can only produce bindings');
    await expect(source.queryBoolean()).rejects.toThrow('Custom SERVICE executors can only produce bindings');
    await expect(source.queryVoid()).rejects.toThrow('Custom SERVICE executors can only produce bindings');
  });

  describe('queryBindings', () => {
    it('should provide metadata without invoking the executor', async() => {
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      expect(execute).not.toHaveBeenCalled();
    });

    it('should invoke the executor once the stream is read', async() => {
      execute.mockResolvedValue([ bindingsS ]);
      const bindings = source.queryBindings(body, context);
      expect(execute).not.toHaveBeenCalled();
      await expect(bindings).toEqualBindingsStream([ bindingsS ]);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('should pass the rebuilt clause, no bindings, and the context to the executor without a bind-join', async() => {
      execute.mockResolvedValue([]);
      await expect(source.queryBindings(body, context)).toEqualBindingsStream([]);
      expect(execute).toHaveBeenCalledWith(serviceOperation, undefined, context);
    });

    it('should rebuild a silent clause if the context marks the source as silent', async() => {
      execute.mockResolvedValue([]);
      const contextSilent = context.set(KeysQueryOperation.silent, true);
      await expect(source.queryBindings(body, contextSilent)).toEqualBindingsStream([]);
      expect(execute)
        .toHaveBeenCalledWith(AF.createService(body, DF.namedNode('urn:service'), true), undefined, contextSilent);
    });

    it('should pass the bindings of a bind-join to the executor', async() => {
      execute.mockResolvedValue([]);
      const contextJoin = context.set(KeysQueryOperation.joinBindings, bindingsS);
      await expect(source.queryBindings(body, contextJoin)).toEqualBindingsStream([]);
      expect(execute).toHaveBeenCalledWith(serviceOperation, bindingsS, contextJoin);
    });

    it('should return the bindings of a stream', async() => {
      execute.mockResolvedValue(new ArrayIterator([ bindingsS, bindingsSO ], { autoStart: false }));
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsS, bindingsSO ]);
    });

    it('should return the bindings of an array', async() => {
      execute.mockResolvedValue([ bindingsS, bindingsSO ]);
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsS, bindingsSO ]);
    });

    it('should return the bindings of an iterable', async() => {
      execute.mockResolvedValue(new Set([ bindingsSO ]));
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsSO ]);
    });

    it('should emit stream errors for a rejecting executor', async() => {
      execute.mockRejectedValue(new Error('Executor failure'));
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings.toArray()).rejects.toThrow('Executor failure');
    });

    it('should emit stream errors for a throwing executor', async() => {
      execute.mockImplementation(() => {
        throw new Error('Executor failure');
      });
      const bindings = source.queryBindings(body, context);
      await expect(bindings.toArray()).rejects.toThrow('Executor failure');
    });

    it('should use the metadata provided by the executor without invoking it', async() => {
      source = new QuerySourceServiceExecutor('urn:service', { execute, getMetadata }, DF, AF);
      getMetadata.mockResolvedValue({ cardinality: { type: 'exact', value: 3 }});
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual({
        ...metadata,
        cardinality: { type: 'exact', value: 3 },
      });
      expect(getMetadata).toHaveBeenCalledWith(serviceOperation, context);
      expect(execute).not.toHaveBeenCalled();
    });

    it('should fall back to default metadata when the executor provides none', async() => {
      source = new QuerySourceServiceExecutor('urn:service', { execute, getMetadata }, DF, AF);
      getMetadata.mockResolvedValue({});
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
    });

    it('should emit stream errors for a rejecting metadata hook', async() => {
      source = new QuerySourceServiceExecutor('urn:service', { execute, getMetadata }, DF, AF);
      getMetadata.mockRejectedValue(new Error('Metadata failure'));
      const bindings = source.queryBindings(body, context);
      await expect(getMetadataBindings(bindings)()).rejects.toThrow('Metadata failure');
    });
  });
});
