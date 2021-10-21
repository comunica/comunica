import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfJoinMultiEmpty } from '../lib/ActorRdfJoinMultiEmpty';
const arrayifyStream = require('arrayify-stream');

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

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMultiEmpty({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should not test on no 0 cardinality', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 15 }),
              },
              operation: <any> {},
            },
          ],
        })).rejects.toThrowError('Actor actor can only join entries where at least one is empty');
      });

      it('should test on a 0 cardinality', async() => {
        expect(await actor.test({
          type: 'inner',
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 0 }),
              },
              operation: <any> {},
            },
          ],
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
                variables: [],
                metadata: () => Promise.resolve({ cardinality: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                bindingsStream: new ArrayIterator([], { autoStart: false }),
                variables: [],
                metadata: () => Promise.resolve({ cardinality: 15 }),
              },
              operation: <any> {},
            },
          ],
        });
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
        expect(await output.metadata!()).toEqual({ cardinality: 0 });
      });
    });
  });
});
