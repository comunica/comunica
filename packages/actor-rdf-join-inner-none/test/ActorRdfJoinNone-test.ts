import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfJoinNone } from '../lib/ActorRdfJoinNone';
import '@comunica/jest';

const BF = new BindingsFactory();

describe('ActorRdfJoinNone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinNone instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinNone;
    let context: IActionContext;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinNone({ name: 'actor', bus, mediatorJoinSelectivity });
      context = new ActionContext();
    });

    describe('test', () => {
      it('should not test on entries with length > 0', async() => {
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
          ],
          context,
        })).rejects.toThrowError('Actor actor can only join zero entries');
      });

      it('should test on zero entries', async() => {
        expect(await actor.test({
          type: 'inner',
          entries: [],
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
        const output = await actor.run(<any> {
          entries: [],
          context,
        });
        await expect(output.bindingsStream).toEqualBindingsStream([ BF.bindings() ]);
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'exact', value: 1 }, canContainUndefs: false, variables: []});
      });
    });
  });
});
