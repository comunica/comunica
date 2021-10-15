import { Bus } from '@comunica/core';
import { ActorRdfJoinSingle } from '../lib/ActorRdfJoinSingle';

describe('ActorRdfJoinSingle', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinSingle instance', () => {
    let actor: ActorRdfJoinSingle;

    beforeEach(() => {
      actor = new ActorRdfJoinSingle({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should not test on entries with length zero', async() => {
        await expect(actor.test({
          entries: [],
        })).rejects.toThrowError('Actor actor can only join a single entry');
      });

      it('should not test on entries with length two', async() => {
        await expect(actor.test({
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
        })).rejects.toThrowError('Actor actor can only join a single entry');
      });

      it('should test on one entry', async() => {
        expect(await actor.test({
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 10 }),
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
        });
        expect(output).toBe(entryOutput);
        expect(await output.metadata!()).toEqual({ cardinality: 10 });
      });
    });
  });
});
