import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationSlice } from '../lib/ActorQueryOperationSlice';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationSlice', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorQueryOperationMetaInf: any;
  let mediatorQueryOperationUndefs: any;
  let mediatorQueryOperationQuads: any;
  let mediatorQueryOperationBoolean: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      })),
    };
    mediatorQueryOperationMetaInf = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorQueryOperationUndefs = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: true,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorQueryOperationQuads = {
      mediate: (arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('3')),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false }),
        operated: arg,
        type: 'quads',
      }),
    };
    mediatorQueryOperationBoolean = {
      mediate: (arg: any) => Promise.resolve({
        booleanResult: true,
        type: 'boolean',
      }),
    };
  });

  describe('The ActorQueryOperationSlice module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationSlice).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationSlice constructor', () => {
      expect(new (<any> ActorQueryOperationSlice)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationSlice);
      expect(new (<any> ActorQueryOperationSlice)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationSlice objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationSlice)();
      }).toThrow(`Class constructor ActorQueryOperationSlice cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationSlice instance', () => {
    let actor: ActorQueryOperationSlice;

    beforeEach(() => {
      actor = new ActorQueryOperationSlice({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on slices', async() => {
      const op: any = { operation: { type: 'slice', start: 0, length: 100 }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-slices', async() => {
      const op: any = { operation: { type: 'no-slice' }};
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream for start 0 and length 100', async() => {
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      expect(mediatorQueryOperation.mediate.mock.calls[0][0].context.get(KeysQueryOperation.limitIndicator))
        .toBe(100);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 1 and length 100', async() => {
      const op: any = { operation: { type: 'project', start: 1, length: 100 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 3 and length 100', async() => {
      const op: any = { operation: { type: 'project', start: 3, length: 100 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 0 and length 3', async() => {
      const op: any = { operation: { type: 'project', start: 0, length: 3 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 0 and length 2', async() => {
      const op: any = { operation: { type: 'project', start: 0, length: 2 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      ]);
    });

    it('should run on a stream for start 0 and length 0', async() => {
      const op: any = { operation: { type: 'project', start: 0, length: 0 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(mediatorQueryOperation.mediate.mock.calls[0][0].context.get(KeysQueryOperation.limitIndicator))
        .toBeUndefined();
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 1 and length 3', async() => {
      const op: any = { operation: { type: 'project', start: 1, length: 3 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 1 and length 1', async() => {
      const op: any = { operation: { type: 'project', start: 1, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      ]);
    });

    it('should run on a stream for start 2 and length 1', async() => {
      const op: any = { operation: { type: 'project', start: 2, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 2 and length 0', async() => {
      const op: any = { operation: { type: 'project', start: 2, length: 0 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 3 and length 1', async() => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 3 and length 0', async() => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 4 and length 1', async() => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 4 and length 0', async() => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it(`should run on a stream for start 0 and length 100 when the mediator provides metadata with infinity`, async() => {
      actor = new ActorQueryOperationSlice({
        bus,
        mediatorQueryOperation: mediatorQueryOperationMetaInf,
        name: 'actor',
      });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides undefs', async() => {
      actor = new ActorQueryOperationSlice({
        bus,
        mediatorQueryOperation: mediatorQueryOperationUndefs,
        name: 'actor',
      });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },
        canContainUndefs: true,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 0 and no length', async() => {
      const op: any = { operation: { type: 'project', start: 0 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream of quads for start 0 and length 2', async() => {
      actor = new ActorQueryOperationSlice({ bus, mediatorQueryOperation: mediatorQueryOperationQuads, name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 2 }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeQuads(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false });
      expect(output.type).toBe('quads');
      await expect(arrayifyStream(output.quadStream)).resolves.toEqual([
        DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
        DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
      ]);
    });

    it('should error if the output is neither quads nor bindings', async() => {
      actor = new ActorQueryOperationSlice({
        bus,
        mediatorQueryOperation: mediatorQueryOperationBoolean,
        name: 'actor',
      });
      const op: any = { operation: { type: 'project', start: 0 }, context: new ActionContext() };
      await expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
