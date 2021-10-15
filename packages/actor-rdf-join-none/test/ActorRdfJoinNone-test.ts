import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ActorRdfJoinNone } from '../lib/ActorRdfJoinNone';
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfJoinNone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinNone instance', () => {
    let actor: ActorRdfJoinNone;

    beforeEach(() => {
      actor = new ActorRdfJoinNone({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should not test on entries with length > 0', async() => {
        await expect(actor.test({
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 10 }),
              },
              operation: <any> {},
            },
          ],
        })).rejects.toThrowError('Actor actor can only join zero entries');
      });

      it('should test on zero entries', async() => {
        expect(await actor.test({
          entries: [],
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
        });
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([ Bindings({}) ]);
        expect(await output.metadata!()).toEqual({ cardinality: 1 });
      });
    });
  });
});
