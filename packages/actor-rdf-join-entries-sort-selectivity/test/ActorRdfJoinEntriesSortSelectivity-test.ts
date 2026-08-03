import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfJoinEntriesSortSelectivity } from '../lib/ActorRdfJoinEntriesSortSelectivity';
import '@comunica/utils-jest';

describe('ActorRdfJoinEntriesSortSelectivity', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorJoinSelectivity = <any> {
      mediate: async(action: any) => {
        let minVariablesLength = Number.MAX_VALUE;
        let commonVariables: string[] | undefined;
        for (const entry of action.entries) {
          if (entry.metadata.v.length < minVariablesLength) {
            minVariablesLength = entry.metadata.v.length;
          }
          if (commonVariables === undefined) {
            commonVariables = entry.metadata.v;
          } else {
            commonVariables = commonVariables.filter(v => entry.metadata.v.includes(v));
          }
        }
        return { selectivity: 1 / commonVariables!.length };
      },
    };
  });

  describe('An ActorRdfJoinEntriesSortSelectivity instance', () => {
    let actor: ActorRdfJoinEntriesSortSelectivity;

    beforeEach(() => {
      actor = new ActorRdfJoinEntriesSortSelectivity({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should return for empty entries', async() => {
        await expect(actor.test({
          entries: [],
          context,
        })).resolves.toPassTest({ accuracy: 0.501 });
      });

      it('should return for non-empty entries', async() => {
        await expect(actor.test({
          entries: [
            <any> { metadata: { cardinality: { value: 10 }}},
            <any> { metadata: { cardinality: { value: 100 }}},
          ],
          context,
        })).resolves.toPassTest({ accuracy: 0.501 });
      });
    });

    describe('run', () => {
      it('should handle zero entries', async() => {
        await expect(actor.run({
          entries: [],
          context,
        })).resolves.toEqual({ entries: []});
      });

      it('should handle one entry', async() => {
        await expect(actor.run({
          entries: [
            <any> {
              metadata: { v: [ 'a' ]},
            },
          ],
          context,
        })).resolves.toEqual({
          entries: [
            {
              metadata: { v: [ 'a' ]},
            },
          ],
        });
      });

      it('should handle multiple entries', async() => {
        await expect(actor.run({
          entries: [
            <any> { metadata: { v: [ 'a', 'b' ]}},
            <any> { metadata: { v: [ 'a' ]}},
            <any> { metadata: { v: [ 'a', 'b', 'c' ]}},
          ],
          context,
        })).resolves.toEqual({
          entries: [
            <any> { metadata: { v: [ 'a', 'b', 'c' ]}},
            <any> { metadata: { v: [ 'a', 'b' ]}},
            <any> { metadata: { v: [ 'a' ]}},
          ],
        });
      });
    });
  });
});
