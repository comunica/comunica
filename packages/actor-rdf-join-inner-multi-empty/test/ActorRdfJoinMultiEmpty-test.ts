import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfJoinMultiEmpty } from '../lib/ActorRdfJoinMultiEmpty';
import '@comunica/jest';

describe('ActorRdfJoinMultiEmpty', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiEmpty instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinMultiEmpty;
    let context: IActionContext;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMultiEmpty({ name: 'actor', bus, mediatorJoinSelectivity });
      context = new ActionContext();
    });

    describe('test', () => {
      it('should not test on no 0 cardinality', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 10 }}),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 15 }}),
              },
              operation: <any> {},
            },
          ],
          context,
        })).rejects.toThrowError('Actor actor can only join entries where at least one is empty');
      });

      it('should test on a 0 cardinality', async() => {
        expect(await actor.test({
          type: 'inner',
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 10 }}),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 0 }}),
              },
              operation: <any> {},
            },
          ],
          context,
        })).toEqual({
          iterations: 0,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });
    });

    describe('getOutput', () => {
      it('should return an empty stream', async() => {
        const output = await actor.run(<any> {
          entries: [
            {
              output: <any> {
                type: 'bindings',
                bindingsStream: new ArrayIterator([], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 10 }, variables: []}),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                bindingsStream: new ArrayIterator([], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 15 }, variables: []}),
              },
              operation: <any> {},
            },
          ],
          context,
        });
        await expect(output.bindingsStream).toEqualBindingsStream([]);
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'exact', value: 0 }, canContainUndefs: false, variables: []});
      });
    });
  });
});
