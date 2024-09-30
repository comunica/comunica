import { Readable } from 'node:stream';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinOptionalHash } from '../lib/ActorRdfJoinOptionalHash';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinOptionalHash', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorRdfJoinOptionalHash instance with canHandleUndefs and with blocking', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let actor: ActorRdfJoinOptionalHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinOptionalHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: true,
        blocking: true,
      });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
      });

      it('should not test on entries without overlapping variables', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest('Actor actor can only join entries with at least one common variable');
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 7.2,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });

      it('should test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 7.2,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('with disjoint domain in right', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should propagate errors in the optional stream', async() => {
        const errorStream = new Readable();
        errorStream._read = () => {
          errorStream.emit('error', new Error('optional-hash-error'));
        };
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: wrap(errorStream, { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream.toArray()).rejects.toThrow('optional-hash-error');
      });
    });
  });

  describe('An ActorRdfJoinOptionalHash instance with canHandleUndefs and without blocking', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let actor: ActorRdfJoinOptionalHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinOptionalHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: true,
        blocking: false,
      });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
      });

      it('should not test on entries without overlapping variables', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest('Actor actor can only join entries with at least one common variable');
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 8,
          blockingItems: 0,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });

      it('should test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 8,
          blockingItems: 0,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('with disjoint domain in right', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should handle two entries with optional stream being slow', async() => {
        const readable = new Readable({ objectMode: true });
        readable._read = () => {
          readable._read = () => {
            // Do nothing
          };

          setTimeout(() => {
            readable.push(BF.bindings([
              [ DF.variable('a'), DF.literal('1') ],
              [ DF.variable('b'), DF.literal('1') ],
            ]));
            readable.push(BF.bindings([
              [ DF.variable('a'), DF.literal('3') ],
              [ DF.variable('b'), DF.literal('1') ],
            ]));
            readable.push(BF.bindings([
              [ DF.variable('a'), DF.literal('3') ],
              [ DF.variable('b'), DF.literal('2') ],
            ]));
            readable.push(null);
          }, 10);
        };

        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: wrap(readable),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should propagate errors in the optional stream', async() => {
        const errorStream = new Readable();
        errorStream._read = () => {
          errorStream.emit('error', new Error('optional-hash-error'));
        };
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: wrap(errorStream, { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream.toArray()).rejects.toThrow('optional-hash-error');
      });
    });
  });

  describe('An ActorRdfJoinOptionalHash instance without canHandleUndefs and with blocking', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let actor: ActorRdfJoinOptionalHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinOptionalHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: false,
        blocking: true,
      });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
      });

      it('should not test on entries without overlapping variables', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest('Actor actor can only join entries with at least one common variable');
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 5.760000000000001,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });

      it('should not test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
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
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest(`Actor actor can not join streams containing undefs`);
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should propagate errors in the optional stream', async() => {
        const errorStream = new Readable();
        errorStream._read = () => {
          errorStream.emit('error', new Error('optional-hash-error'));
        };
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: wrap(errorStream, { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream.toArray()).rejects.toThrow('optional-hash-error');
      });
    });
  });

  describe('An ActorRdfJoinOptionalHash instance without canHandleUndefs and without blocking', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let actor: ActorRdfJoinOptionalHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinOptionalHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: false,
        blocking: false,
      });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
      });

      it('should not test on entries without overlapping variables', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest('Actor actor can only join entries with at least one common variable');
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 6.4,
          blockingItems: 0,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });

      it('should not test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
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
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
              },
            },
          ],
          context,
        })).resolves.toFailTest(`Actor actor can not join streams containing undefs`);
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });

      it('should propagate errors in the optional stream', async() => {
        const errorStream = new Readable();
        errorStream._read = () => {
          errorStream.emit('error', new Error('optional-hash-error'));
        };
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: wrap(errorStream, { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

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
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 9 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream.toArray()).rejects.toThrow('optional-hash-error');
      });
    });
  });
});
