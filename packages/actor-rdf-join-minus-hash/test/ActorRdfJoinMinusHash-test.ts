import { Readable } from 'node:stream';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMinusHash } from '../lib/ActorRdfJoinMinusHash';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinMinusHash', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfJoinMinusHash instance with canHandleUndefs false', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let actor: ActorRdfJoinMinusHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMinusHash({ name: 'actor', bus, mediatorJoinSelectivity, canHandleUndefs: false });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-minus operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'minus', while 'inner' was given.`);
      });

      it('should not test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  {
                    cardinality: 4,
                    pageSize: 100,
                    requestTime: 10,
                    variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                  },
                ),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  {
                    cardinality: 4,
                    pageSize: 100,
                    requestTime: 10,
                    variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                  },
                ),
              },
            },
          ],
          context,
        })).resolves.toFailTest('Actor actor can not join streams containing undefs');
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [],
                }),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 6.4,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });
    });

    describe('getOutput', () => {
      it('should error if left stream errors', async() => {
        const readable = new Readable();
        readable._read = () => {
          readable.emit('error', new Error('Error'));
        };
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: readable,
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
        await expect(arrayifyStream(result.bindingsStream)).rejects.toThrow(new Error('Error'));
      });

      it('should error if right stream errors', async() => {
        const readable = new Readable();
        readable._read = () => {
          readable.emit('error', new Error('Error'));
        };
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: readable,
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
        await expect(arrayifyStream(result.bindingsStream)).rejects.toThrow(new Error('Error'));
      });

      it('should handle entries with common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });

      it('should handle entries without common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });

      it('should handle entries with common variables but exclude graphVariableFromParentScope', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          graphVariableFromParentScope: DF.variable('g'),
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('g'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                    { variable: DF.variable('g'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            cardinality: 3,
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('g'), canBeUndef: false },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });
  });

  describe('An ActorRdfJoinMinusHash instance with canHandleUndefs true', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let actor: ActorRdfJoinMinusHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMinusHash({ name: 'actor', bus, mediatorJoinSelectivity, canHandleUndefs: true });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-minus operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'minus', while 'inner' was given.`);
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  {
                    cardinality: { type: 'estimate', value: 4 },
                    pageSize: 100,
                    requestTime: 10,
                    variables: [],
                  },
                ),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  {
                    cardinality: { type: 'estimate', value: 4 },
                    pageSize: 100,
                    requestTime: 10,
                    variables: [],
                  },
                ),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 8,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });
    });

    describe('getOutput', () => {
      it('should error if left entry errors', async() => {
        const readable = new Readable();
        readable._read = () => {
          readable.emit('error', new Error('Error'));
        };
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: readable,
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
          ],
        });
        await expect(arrayifyStream(result.bindingsStream)).rejects.toThrow(new Error('Error'));
      });

      it('should error if right entry errors', async() => {
        const readable = new Readable();
        readable._read = () => {
          readable.emit('error', new Error('Error'));
        };
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: readable,
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
          ],
        });
        await expect(arrayifyStream(result.bindingsStream)).rejects.toThrow(new Error('Error'));
      });

      it('should handle entries with common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });

      it('should handle entries without common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });

      it('should handle undef in right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                    { variable: DF.variable('b'), canBeUndef: true },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should handle all undefs in right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                    { variable: DF.variable('b'), canBeUndef: true },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('3') ],
          ]),
        ]);
      });

      it('should handle undef in left entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                    { variable: DF.variable('b'), canBeUndef: true },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: true },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should handle undef in left and right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 3,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                    { variable: DF.variable('b'), canBeUndef: true },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  cardinality: 2,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                    { variable: DF.variable('b'), canBeUndef: true },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: 3,
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: true },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });
    });
  });
});
