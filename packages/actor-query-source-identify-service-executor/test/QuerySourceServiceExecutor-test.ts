import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
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
  let serviceExecutor: jest.Mock;
  let source: QuerySourceServiceExecutor;
  let context: IActionContext;
  let operation: Algebra.Service;
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
    serviceExecutor = jest.fn();
    source = new QuerySourceServiceExecutor('urn:service', serviceExecutor);
    context = new ActionContext();
    operation = AF.createService(
      AF.createPattern(DF.variable('s'), DF.namedNode('urn:p'), DF.variable('o')),
      DF.namedNode('urn:service'),
    );
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

  it('should only accept SERVICE clauses in its selector shape', async() => {
    await expect(source.getSelectorShape()).resolves.toEqual({
      type: 'operation',
      operation: { operationType: 'type', type: Algebra.Types.SERVICE },
      children: [
        { type: 'operation', operation: { operationType: 'wildcard' }},
      ],
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
    it('should throw on operations that are not SERVICE clauses', () => {
      expect(() => source.queryBindings(operation.input, context))
        .toThrow('Custom SERVICE executors can only evaluate SERVICE clauses, but received a pattern operation');
    });

    it('should provide metadata without invoking the executor', async() => {
      const bindings = source.queryBindings(operation, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      expect(serviceExecutor).not.toHaveBeenCalled();
    });

    it('should invoke the executor once the stream is read', async() => {
      serviceExecutor.mockResolvedValue([ bindingsS ]);
      const bindings = source.queryBindings(operation, context);
      expect(serviceExecutor).not.toHaveBeenCalled();
      await expect(bindings).toEqualBindingsStream([ bindingsS ]);
      expect(serviceExecutor).toHaveBeenCalledTimes(1);
    });

    it('should pass the clause, no bindings, and the context to the executor outside of a bind-join', async() => {
      serviceExecutor.mockResolvedValue([]);
      await expect(source.queryBindings(operation, context)).toEqualBindingsStream([]);
      expect(serviceExecutor).toHaveBeenCalledWith(operation, undefined, context);
    });

    it('should pass the bindings of a bind-join to the executor', async() => {
      serviceExecutor.mockResolvedValue([]);
      const contextJoin = context.set(KeysQueryOperation.joinBindings, bindingsS);
      await expect(source.queryBindings(operation, contextJoin)).toEqualBindingsStream([]);
      expect(serviceExecutor).toHaveBeenCalledWith(operation, bindingsS, contextJoin);
    });

    it('should return the bindings of a stream', async() => {
      serviceExecutor.mockResolvedValue(new ArrayIterator([ bindingsS, bindingsSO ], { autoStart: false }));
      const bindings = source.queryBindings(operation, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsS, bindingsSO ]);
    });

    it('should return the bindings of an array', async() => {
      serviceExecutor.mockResolvedValue([ bindingsS, bindingsSO ]);
      const bindings = source.queryBindings(operation, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsS, bindingsSO ]);
    });

    it('should return the bindings of an iterable', async() => {
      serviceExecutor.mockResolvedValue(new Set([ bindingsSO ]));
      const bindings = source.queryBindings(operation, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings).toEqualBindingsStream([ bindingsSO ]);
    });

    it('should emit stream errors for a rejecting executor', async() => {
      serviceExecutor.mockRejectedValue(new Error('Executor failure'));
      const bindings = source.queryBindings(operation, context);
      await expect(getMetadataBindings(bindings)()).resolves.toEqual(metadata);
      await expect(bindings.toArray()).rejects.toThrow('Executor failure');
    });

    it('should emit stream errors for a throwing executor', async() => {
      serviceExecutor.mockImplementation(() => {
        throw new Error('Executor failure');
      });
      const bindings = source.queryBindings(operation, context);
      await expect(bindings.toArray()).rejects.toThrow('Executor failure');
    });
  });
});
