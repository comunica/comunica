import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfMetadataAccumulate,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActionContext, Bus } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  MetadataQuads,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings, getSafeQuads } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationLateral } from '../lib/ActorQueryOperationLateral';
import '@comunica/utils-jest';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationLateral', () => {
  let context: IActionContext;
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let op3: () => any;
  let op2: () => any;
  let op2Undef: () => any;
  let opq1: () => any;
  let opq2: () => any;
  let opb1: () => any;

  beforeEach(() => {
    context = new ActionContext();
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      async mediate(arg: any) {
        if (arg.operation.type === 'quads') {
          return {
            quadStream: arg.operation.stream,
            metadata: arg.operation.metadata,
            type: 'quads',
          };
        }
        if (arg.operation.type === 'boolean') {
          return {
            type: 'boolean',
          };
        }
        return {
          bindingsStream: arg.operation.stream,
          metadata: arg.operation.metadata,
          type: 'bindings',
          variables: arg.operation.variables,
        };
      },
    };
    mediatorRdfMetadataAccumulate = <any> {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }}};
        }

        const metadata = { ...action.accumulatedMetadata };
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
          // We're already at infinite, so ignore any later metadata
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        } else {
          if (subMetadata.cardinality.type === 'estimate') {
            metadata.cardinality.type = 'estimate';
          }
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        if (metadata.requestTime ?? subMetadata.requestTime) {
          metadata.requestTime = metadata.requestTime ?? 0;
          subMetadata.requestTime = subMetadata.requestTime ?? 0;
          metadata.requestTime += subMetadata.requestTime;
        }
        if (metadata.pageSize ?? subMetadata.pageSize) {
          metadata.pageSize = metadata.pageSize ?? 0;
          subMetadata.pageSize = subMetadata.pageSize ?? 0;
          metadata.pageSize += subMetadata.pageSize;
        }

        return { metadata };
      },
    };
    op3 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 3 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ], { autoStart: false }),
      type: 'bindings',
    });
    op2 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },

        variables: [{ variable: DF.variable('b'), canBeUndef: false }],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ], { autoStart: false }),
      type: 'bindings',
    });
    op2Undef = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
        variables: [{ variable: DF.variable('b'), canBeUndef: true }],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ]),
      type: 'bindings',
    });
    opq1 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
      }),
      stream: new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ], { autoStart: false }),
      type: 'quads',
    });
    opq2 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
      }),
      stream: new ArrayIterator([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ], { autoStart: false }),
      type: 'quads',
    });
    opb1 = () => ({
      type: 'boolean',
    });
  });

  describe('The ActorQueryOperationLateral module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLateral).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLateral constructor', () => {
      expect(new (<any> ActorQueryOperationLateral)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLateral);
      expect(new (<any> ActorQueryOperationLateral)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLateral objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationLateral)();
      }).toThrow(`Class constructor ActorQueryOperationLateral cannot be invoked without 'new'`);
    });
  });

  describe('ActorQueryOperationLateral#unionVariables', () => {
    it('should return an empty array for an empty input', () => {
      expect(ActorQueryOperationLateral.unionVariables([])).toEqual([]);
    });

    it('should return an empty array for empty inputs', () => {
      expect(ActorQueryOperationLateral.unionVariables([[], [], []])).toEqual([]);
    });

    it('should return a for a single input a', () => {
      expect(ActorQueryOperationLateral.unionVariables([[{ variable: DF.variable('a'), canBeUndef: false }]]))
        .toEqual([{ variable: DF.variable('a'), canBeUndef: false }]);
    });

    it('should return a for a inputs a and a', () => {
      expect(ActorQueryOperationLateral.unionVariables(
        [[{ variable: DF.variable('a'), canBeUndef: false }], [{ variable: DF.variable('a'), canBeUndef: false }]],
      ))
        .toEqual([{ variable: DF.variable('a'), canBeUndef: false }]);
    });

    it('should return a and b for a inputs a, b and a', () => {
      expect(ActorQueryOperationLateral.unionVariables([
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
        [{ variable: DF.variable('a'), canBeUndef: false }],
      ]))
        .toEqual([
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
        ]);
    });

    it('should return a and b for a inputs a, b and a, b', () => {
      expect(ActorQueryOperationLateral.unionVariables([
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
      ]))
        .toEqual([
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c', () => {
      expect(ActorQueryOperationLateral.unionVariables([
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
        [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
          { variable: DF.variable('c'), canBeUndef: false },
        ],
      ]))
        .toEqual([
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
          { variable: DF.variable('c'), canBeUndef: true },
        ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c with some undef', () => {
      expect(ActorQueryOperationLateral.unionVariables([
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
        [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
          { variable: DF.variable('c'), canBeUndef: true },
        ],
      ]))
        .toEqual([
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: true },
          { variable: DF.variable('c'), canBeUndef: true },
        ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c and empty', () => {
      expect(ActorQueryOperationLateral.unionVariables([
        [{ variable: DF.variable('a'), canBeUndef: false }, { variable: DF.variable('b'), canBeUndef: false }],
        [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
          { variable: DF.variable('c'), canBeUndef: false },
        ],
        [],
      ]))
        .toEqual([
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('b'), canBeUndef: true },
          { variable: DF.variable('c'), canBeUndef: true },
        ]);
    });
  });

  describe('ActorQueryOperationLateral#unionMetadata', () => {
    it('should return 0 items for an empty input', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'exact', value: 0 }});
    });

    it('should return 1 items for a single input with 1', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([{
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 1 },

      }], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 1 }});
    });

    it('should return 0 items for a single input with 0', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([{
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 0 },

      }], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 0 }});
    });

    it('should return infinite items for a single input with Infinity', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

        },
      ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
      );
    });

    it('should return 3 items for inputs with 1 and 2 as estimate', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }},
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }},
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }});
    });

    it('should return 3 items for inputs with 1 and 2 as exact', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }},
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 2 }},
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'exact', value: 3 }});
    });

    it('should return 3 items for inputs with 1 and 2 as exact and estimate', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }},
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }},
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }});
    });

    it('should return infinite items for inputs with Infinity and 2', async() => {
      await expect(ActorQueryOperationLateral
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 2 },

          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
      );
    });

    it('should return infinite items for inputs with 1 and Infinity', async() => {
      await expect(ActorQueryOperationLateral
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },

          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
      );
    });

    it('should return infinite items for inputs with Infinity and Infinity', async() => {
      await expect(ActorQueryOperationLateral
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },

          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
      );
    });

    it('should union variables if bindings is true', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
      ], true, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({
          cardinality: { type: 'estimate', value: 3 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: true },
          ],
        });
    });

    it('should union identical variables if bindings is true', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
      ], true, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({
          cardinality: { type: 'estimate', value: 3 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
    });

    it('should union variables identical if bindings is true but propagate canBeUndef', async() => {
      await expect(ActorQueryOperationLateral.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        },
      ], true, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({
          cardinality: { type: 'estimate', value: 3 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
    });

    it('should become invalid once a sub-metadata becomes invalid', async() => {
      const metadatas: MetadataQuads[] = [
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }},
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }},
      ];

      const metadata = await ActorQueryOperationLateral
        .unionMetadata(metadatas, false, context, mediatorRdfMetadataAccumulate);
      const invalidListener = jest.fn();
      metadata.state.addInvalidateListener(invalidListener);
      expect(metadata.state.valid).toBeTruthy();

      metadatas[0].state.invalidate();
      expect(metadata.state.valid).toBeFalsy();
      expect(invalidListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('An ActorQueryOperationLateral instance', () => {
    let actor: ActorQueryOperationLateral;

    beforeEach(() => {
      actor = new ActorQueryOperationLateral(
        { name: 'actor', bus, mediatorQueryOperation, mediatorRdfMetadataAccumulate },
      );
    });

    it('should test on union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'lateral', input, context: new ActionContext() },
      })).resolves.toPassTestVoid();
      for (const op of input) {
        op.stream.destroy();
      }
    });

    it('should not test on non-union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'some-other-type', input },
        context: new ActionContext(),
      })).resolves.toFailTest(`Actor actor only supports lateral operations, but got some-other-type`);
      for (const op of input) {
        op.stream.destroy();
      }
    });

    it('should run on two bindings streams', async() => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2() ]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 5 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on three bindings streams', async() => {
      const output = getSafeBindings(await actor.run(<any> {
        operation: { type: 'union', input: [ op3(), op2(), op2Undef() ]},
        context: new ActionContext(),
      }, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 7 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run with a right bindings stream with undefs', async() => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2Undef() ]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 5 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: true },
          { variable: DF.variable('b'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on two bindings streams with metadata invalidation', async() => {
      // An operation in which we can access the metadata state
      const state = new MetadataValidationState();
      const opCustom = {
        metadata: () => Promise.resolve({
          state,
          cardinality: { type: 'estimate', value: 3 },

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        stream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        type: 'bindings',
      };

      // Execute the operation, and expect a valid metadata
      const op: any = { operation: { type: 'union', input: [ op3(), opCustom ]}, context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      const outputMetadata = await output.metadata();
      expect(outputMetadata).toMatchObject({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 6 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });

      // After invoking this, we expect the returned metadata to also be invalidated
      state.invalidate();
      expect(outputMetadata.state.valid).toBeFalsy();

      // We can request a new metadata object, which will be valid again.
      const outputMetadata2 = await output.metadata();
      expect(outputMetadata2).toMatchObject({
        state: { valid: true },
        cardinality: { type: 'estimate', value: 6 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
    });

    it('should run on two quad streams', async() => {
      const op: any = { operation: { type: 'union', input: [ opq1(), opq2() ]}, context: new ActionContext() };
      const output = getSafeQuads(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 4 },
      });
      expect(output.type).toBe('quads');
      await expect(output.quadStream.toArray()).resolves.toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ]);
    });

    it('should throw on different stream types', async() => {
      const op: any = { operation: { type: 'union', input: [ op2(), opq2() ]}, context: new ActionContext() };
      await expect(actor.run(op, undefined)).rejects.toThrow(`Unable to union bindings and quads`);
    });

    it('should throw on unsupported stream types', async() => {
      const op: any = { operation: { type: 'union', input: [ opb1() ]}, context: new ActionContext() };
      await expect(actor.run(op, undefined)).rejects.toThrow(`Unable to union boolean`);
    });
  });
});
