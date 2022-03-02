import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfJoinSingle } from '../lib/ActorRdfJoinSingle';

describe('ActorRdfJoinSingle', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinSingle instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinSingle;
    let context: IActionContext;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinSingle({ name: 'actor', bus, mediatorJoinSelectivity });
      context = new ActionContext();
    });

    describe('test', () => {
      it('should not test on entries with length zero', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [],
          context,
        })).rejects.toThrowError('Actor actor can only join a single entry');
      });

      it('should not test on entries with length two', async() => {
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
                metadata: () => Promise.resolve({ cardinality: 10 }),
              },
              operation: <any> {},
            },
          ],
          context,
        })).rejects.toThrowError('Actor actor can only join a single entry');
      });

      it('should test on one entry', async() => {
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
      it('should return a stream with one empty bindings', async() => {
        const entryOutput = {
          type: 'bindings',
          variables: [],
          metadata: () => Promise.resolve({ cardinality: 10 }),
        };
        const output = await actor.run(<any> {
          entries: [
            {
              output: <any> entryOutput,
              operation: <any> {},
            },
          ],
          context,
        });
        expect(output).toBe(entryOutput);
        expect(await output.metadata()).toEqual({ cardinality: 10 });
      });
    });
  });
});
