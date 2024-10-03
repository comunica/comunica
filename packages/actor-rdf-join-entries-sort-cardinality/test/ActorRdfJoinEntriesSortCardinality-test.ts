import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfJoinEntriesSortCardinality } from '../lib/ActorRdfJoinEntriesSortCardinality';
import '@comunica/utils-jest';

describe('ActorRdfJoinEntriesSortCardinality', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfJoinEntriesSortCardinality instance', () => {
    let actor: ActorRdfJoinEntriesSortCardinality;

    beforeEach(() => {
      actor = new ActorRdfJoinEntriesSortCardinality({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should return true', async() => {
        await expect(actor.test(<any> {})).resolves.toPassTestVoid();
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
              metadata: { cardinality: { value: 10 }},
            },
          ],
          context,
        })).resolves.toEqual({
          entries: [
            {
              metadata: { cardinality: { value: 10 }},
            },
          ],
        });
      });

      it('should handle multiple entries', async() => {
        await expect(actor.run({
          entries: [
            <any> { metadata: { cardinality: { value: 20 }}},
            <any> { metadata: { cardinality: { value: 10 }}},
            <any> { metadata: { cardinality: { value: 30 }}},
          ],
          context,
        })).resolves.toEqual({
          entries: [
            { metadata: { cardinality: { value: 10 }}},
            { metadata: { cardinality: { value: 20 }}},
            { metadata: { cardinality: { value: 30 }}},
          ],
        });
      });
    });
  });
});
