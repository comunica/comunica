import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings, getSafeBoolean, getSafeQuads } from '@comunica/utils-query-operation';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationSlice } from '../lib/ActorQueryOperationSlice';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationSlice', () => {
  const sliceOp = (start: number, length?: number): any =>
    ({ type: 'project', input: { type: 'bgp' }, start, length });

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

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
          variables: [{ variable: DF.variable('a'), canBeUndef: true }],
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
        metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }}),
        operated: arg,
        type: 'quads',
      }),
    };
    mediatorQueryOperationBoolean = {
      mediate: () => Promise.resolve({
        execute: async() => true,
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
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-slices', async() => {
      const op: any = { operation: { type: 'no-slice' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports slice operations, but got no-slice`);
    });

    it('should run on a stream for start 0 and length 100', async() => {
      const op: any = { operation: sliceOp(0, 100), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
      const op: any = { operation: sliceOp(1, 100), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 3 and length 100', async() => {
      const op: any = { operation: sliceOp(3, 100), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 0 and length 3', async() => {
      const op: any = { operation: sliceOp(0, 3), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 0 and length 2', async() => {
      const op: any = { operation: sliceOp(0, 2), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      ]);
    });

    it('should run on a stream for start 0 and length 0', async() => {
      const op: any = { operation: sliceOp(0, 0), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(mediatorQueryOperation.mediate.mock.calls[0][0].context.get(KeysQueryOperation.limitIndicator))
        .toBeUndefined();
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 1 and length 3', async() => {
      const op: any = { operation: sliceOp(1, 3), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 2 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 1 and length 1', async() => {
      const op: any = { operation: sliceOp(1, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 1 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      ]);
    });

    it('should run on a stream for start 2 and length 1', async() => {
      const op: any = { operation: sliceOp(2, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 1 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 2 and length 0', async() => {
      const op: any = { operation: sliceOp(2, 0), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 3 and length 1', async() => {
      const op: any = { operation: sliceOp(3, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 3 and length 0', async() => {
      const op: any = { operation: sliceOp(3, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 4 and length 1', async() => {
      const op: any = { operation: sliceOp(4, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on a stream for start 4 and length 0', async() => {
      const op: any = { operation: sliceOp(4, 1), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 0 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
      const op: any = { operation: sliceOp(0, 100), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
      const op: any = { operation: sliceOp(0, 100), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },
        variables: [{ variable: DF.variable('a'), canBeUndef: true }],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on a stream for start 0 and no length', async() => {
      const op: any = { operation: sliceOp(0), context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 3 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
      const op: any = { operation: sliceOp(0, 2), context: new ActionContext() };
      const output = getSafeQuads(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { type: 'estimate', value: 2 }});
      expect(output.type).toBe('quads');
      await expect(arrayifyStream(output.quadStream)).resolves.toEqual([
        DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
        DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
      ]);
    });

    it('should return the output as-is if the output is neither quads nor bindings', async() => {
      actor = new ActorQueryOperationSlice({
        bus,
        mediatorQueryOperation: mediatorQueryOperationBoolean,
        name: 'actor',
      });
      const op: any = { operation: sliceOp(0), context: new ActionContext() };
      const output = getSafeBoolean(await actor.run(op, undefined));
      expect(output.type).toBe('boolean');
      await expect(output.execute()).resolves.toBe(true);
    });

    describe('pushing the limit down into an ORDER BY', () => {
      const orderBy = { type: 'orderby', input: { type: 'bgp' }, expressions: []};

      const runSlice = async(input: any, start: number, length?: number): Promise<any> => {
        const op: any = { operation: { type: 'slice', input, start, length }, context: new ActionContext() };
        await arrayifyStream(getSafeBindings(await actor.run(op, undefined)).bindingsStream);
        return mediatorQueryOperation.mediate.mock.calls[0][0].operation;
      };

      it('should annotate a direct ORDER BY with the number of results that will be read', async() => {
        await expect(runSlice(orderBy, 0, 10)).resolves.toEqual({ ...orderBy, metadata: { sortLimit: 10 }});
      });

      it('should include the offset in the annotation', async() => {
        await expect(runSlice(orderBy, 90, 10)).resolves.toEqual({ ...orderBy, metadata: { sortLimit: 100 }});
      });

      it('should keep other metadata on the ORDER BY', async() => {
        const annotated = { ...orderBy, metadata: { scopedSource: 'source' }};
        await expect(runSlice(annotated, 0, 10)).resolves
          .toEqual({ ...orderBy, metadata: { scopedSource: 'source', sortLimit: 10 }});
      });

      it('should annotate an ORDER BY below a projection', async() => {
        const input = { type: 'project', input: orderBy, variables: []};
        await expect(runSlice(input, 0, 10)).resolves
          .toEqual({ ...input, input: { ...orderBy, metadata: { sortLimit: 10 }}});
      });

      it('should annotate an ORDER BY below an extend', async() => {
        const input = { type: 'extend', input: orderBy, variable: DF.variable('a'), expression: {}};
        await expect(runSlice(input, 0, 10)).resolves
          .toEqual({ ...input, input: { ...orderBy, metadata: { sortLimit: 10 }}});
      });

      it('should not annotate without a limit', async() => {
        await expect(runSlice(orderBy, 10)).resolves.toBe(orderBy);
      });

      it('should not annotate an ORDER BY below a distinct', async() => {
        const input = { type: 'distinct', input: orderBy };
        await expect(runSlice(input, 0, 10)).resolves.toBe(input);
      });

      it('should not annotate when there is no ORDER BY', async() => {
        const input = { type: 'project', input: { type: 'bgp' }, variables: []};
        await expect(runSlice(input, 0, 10)).resolves.toBe(input);
      });
    });
  });
});
