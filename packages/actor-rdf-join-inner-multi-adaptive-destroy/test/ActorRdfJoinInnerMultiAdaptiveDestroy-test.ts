import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type {
  MediatorRdfJoinSelectivity,
} from '@comunica/bus-rdf-join-selectivity';

import { KeysRdfJoin } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, IJoinEntry } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinInnerMultiAdaptiveDestroy } from '../lib/ActorRdfJoinInnerMultiAdaptiveDestroy';
import '@comunica/jest';

jest.useFakeTimers();

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('ActorRdfJoinInnerMultiAdaptiveDestroy', () => {
  let bus: any;
  let context: IActionContext;
  let entries: IJoinEntry[];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    entries = [
      {
        output: {
          bindingsStream: new ArrayIterator([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('b'), DF.literal('b1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('b'), DF.literal('b2') ],
            ]),
          ]),
          metadata: () => Promise.resolve(
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 4 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            },
          ),
          type: 'bindings',
        },
        operation: <any> {},
      },
      {
        output: {
          bindingsStream: new ArrayIterator([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: () => Promise.resolve(
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('c') ],
            },
          ),
          type: 'bindings',
        },
        operation: <any> {},
      },
    ];
  });

  describe('An ActorRdfJoinInnerMultiAdaptiveDestroy instance', () => {
    let actor: ActorRdfJoinInnerMultiAdaptiveDestroy;
    let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
    let mediatorJoin: MediatorRdfJoin;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorJoin = <any> {
        mediate: jest.fn(async action => {
          // Fully consume the input entries
          for (const entry of action.entries) {
            await entry.output.bindingsStream.toArray();
          }

          return {
            type: 'bindings',
            bindingsStream: new ArrayIterator([
              BF.fromRecord({ a: DF.namedNode('ex:a1') }),
              BF.fromRecord({ a: DF.namedNode('ex:a2') }),
            ]),
            metadata: async() => ({ a: 'b' }),
          };
        }),
      };
      actor = new ActorRdfJoinInnerMultiAdaptiveDestroy({
        name: 'actor',
        bus,
        mediatorJoin,
        mediatorJoinSelectivity,
        timeout: 1_000,
      });
    });

    it('should test', () => {
      return expect(actor.test({
        context,
        type: 'inner',
        entries,
      })).resolves.toEqual({
        blockingItems: 0,
        iterations: 0,
        persistedItems: 0,
        requestTime: 0,
      });
    });

    it('should not test with skipAdaptiveJoin', () => {
      return expect(actor.test({
        context: context.set(KeysRdfJoin.skipAdaptiveJoin, true),
        type: 'inner',
        entries,
      })).rejects.toThrow('Actor actor could not run because adaptive join processing is disabled.');
    });

    it('should run without reaching the timeout', async() => {
      const output = await actor.run({
        context,
        type: 'inner',
        entries,
      });

      const destroy0 = jest.spyOn(entries[0].output.bindingsStream, 'destroy');
      const destroy1 = jest.spyOn(entries[0].output.bindingsStream, 'destroy');

      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toEqual({ a: 'b' });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ a: DF.namedNode('ex:a1') }),
        BF.fromRecord({ a: DF.namedNode('ex:a2') }),
      ]);

      expect(mediatorJoin.mediate).toHaveBeenCalledTimes(1);
      expect(mediatorJoin.mediate).toHaveBeenCalledWith({
        type: 'inner',
        entries: expect.anything(),
        context: context.set(KeysRdfJoin.skipAdaptiveJoin, true),
      });

      expect(destroy0).toHaveBeenCalledTimes(0);
      expect(destroy1).toHaveBeenCalledTimes(0);
    });

    it('should run with reaching the timeout', async() => {
      const output = await actor.run({
        context,
        type: 'inner',
        entries,
      });
      const destroy0 = jest.spyOn(entries[0].output.bindingsStream, 'destroy');
      const destroy1 = jest.spyOn(entries[0].output.bindingsStream, 'destroy');

      jest.runAllTimers();

      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toEqual({ a: 'b' });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.fromRecord({ a: DF.namedNode('ex:a1') }),
        BF.fromRecord({ a: DF.namedNode('ex:a2') }),
      ]);

      expect(mediatorJoin.mediate).toHaveBeenCalledTimes(2);
      expect(mediatorJoin.mediate).toHaveBeenNthCalledWith(1, {
        type: 'inner',
        entries: expect.anything(),
        context: context.set(KeysRdfJoin.skipAdaptiveJoin, true),
      });
      expect(mediatorJoin.mediate).toHaveBeenNthCalledWith(2, {
        type: 'inner',
        entries: expect.anything(),
        context: context.set(KeysRdfJoin.skipAdaptiveJoin, true),
      });

      expect(destroy0).toHaveBeenCalledTimes(1);
      expect(destroy1).toHaveBeenCalledTimes(1);
    });
  });
});
