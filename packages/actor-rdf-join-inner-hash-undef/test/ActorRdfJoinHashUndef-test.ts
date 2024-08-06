import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { Bindings, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import '@comunica/jest';
import { ActorRdfJoinHashUndef } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory();

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line ts/require-array-sort-compare
  const keys = [ ...b.keys() ].sort();
  return keys.map(k => `${k.value}:${b.get(k)!.value}`).toString();
}

describe('ActorRdfJoinHashUndef', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
    IActorTest,
    IActorRdfJoinSelectivityOutput
  >;
  let actor: ActorRdfJoinHashUndef;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorJoinSelectivity = <any> {
      mediate: async() => ({ selectivity: 1 }),
    };
    actor = new ActorRdfJoinHashUndef({
      name: 'actor',
      bus,
      mediatorJoinSelectivity,
    });
  });

  describe('test', () => {
    it('should not test on zero entries', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: [],
        context,
      })).rejects.toThrow('actor requires at least two join entries.');
    });

    it('should not test on one entry', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: <any> [{}],
        context,
      })).rejects.toThrow('actor requires at least two join entries.');
    });

    it('should not test on three entries', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: <any> [{}, {}, {}],
        context,
      })).rejects.toThrow('actor requires 2 join entries at most. The input contained 3.');
    });

    it('should not test on a non-inner operation', async() => {
      await expect(actor.test({
        type: 'optional',
        entries: <any> [{}, {}],
        context,
      })).rejects.toThrow(`actor can only handle logical joins of type 'inner', while 'optional' was given.`);
    });

    it('should not test on entries without overlapping variables', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: <any> [
          {
            output: {
              type: 'bindings',
              metadata: () => Promise.resolve({
                cardinality: { type: 'estimate', value: 4 },
                pageSize: 100,
                requestTime: 10,
                variables: [ DF.variable('a') ],
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
                variables: [ DF.variable('b') ],
              }),
            },
          },
        ],
        context,
      })).rejects.toThrow('Actor actor can only join entries with at least one common variable');
    });

    it('should test on two entries', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: <any> [
          {
            output: {
              type: 'bindings',
              metadata: () => Promise.resolve({
                cardinality: { type: 'estimate', value: 4 },
                pageSize: 100,
                requestTime: 10,
                variables: [ DF.variable('a') ],
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
                variables: [ DF.variable('a') ],
              }),
            },
          },
        ],
        context,
      })).resolves.toEqual({
        iterations: 8,
        blockingItems: 4,
        persistedItems: 4,
        requestTime: 0.8,
      });
    });

    it('should test on two entries with undefs', async() => {
      await expect(actor.test({
        type: 'inner',
        entries: <any> [
          {
            output: {
              type: 'bindings',
              metadata: () => Promise.resolve({
                cardinality: { type: 'estimate', value: 4 },
                pageSize: 100,
                requestTime: 10,
                canContainUndefs: true,
                variables: [ DF.variable('a') ],
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
                canContainUndefs: true,
                variables: [ DF.variable('a') ],
              }),
            },
          },
        ],
        context,
      })).resolves.toEqual({
        iterations: 8,
        blockingItems: 4,
        persistedItems: 4,
        requestTime: 0.8,
      });
    });
  });

  describe('run', () => {
    it('should handle two entries', async() => {
      const action: IActionRdfJoin = {
        type: 'inner',
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
                canContainUndefs: true,
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
          cardinality: { type: 'estimate', value: 9 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
      await expect(result.bindingsStream).toEqualBindingsStream([
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

    it('should propagate errors in the optional stream', async() => {
      const errorStream = new Readable();
      errorStream._read = () => {
        errorStream.emit('error', new Error('optional-hash-error'));
      };
      const action: IActionRdfJoin = {
        type: 'inner',
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
              bindingsStream: wrap(errorStream, { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: true,
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
          cardinality: { type: 'estimate', value: 9 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
      await expect(result.bindingsStream.toArray()).rejects.toThrow('optional-hash-error');
    });
  });
});
