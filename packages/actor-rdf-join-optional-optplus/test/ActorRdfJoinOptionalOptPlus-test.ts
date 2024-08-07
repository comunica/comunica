import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-inner-nestedloop';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin, MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinOptionalOptPlus } from '../lib/ActorRdfJoinOptionalOptPlus';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinOptionalOptPlus', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorRdfJoinOptionalOptPlus instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let actor: ActorRdfJoinOptionalOptPlus;
    let mediatorJoin: MediatorRdfJoin;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorJoin = <any> {
        mediate: async(action: IActionRdfJoin) => {
          const actor = new ActorRdfJoinNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity });
          return actor.run(action);
        },
      };
      actor = new ActorRdfJoinOptionalOptPlus({ name: 'actor', bus, mediatorJoinSelectivity, mediatorJoin });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).rejects.toThrow('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).rejects.toThrow(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
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
                }),
              },
            },
          ],
          context,
        })).resolves.toEqual({
          iterations: 8,
          blockingItems: 0,
          persistedItems: 0,
          requestTime: 0,
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const result = await actor.run(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 12 },
            canContainUndefs: true,
            variables: [ DF.variable('a'), DF.variable('b') ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
          ]),
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
        ]);
      });
    });
  });
});
