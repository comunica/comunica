import { Bus } from '@comunica/core';
import { ActorRdfJoinMultiEmpty } from '../lib/ActorRdfJoinMultiEmpty';
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfJoinMultiEmpty', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiEmpty instance', () => {
    let actor: ActorRdfJoinMultiEmpty;

    beforeEach(() => {
      actor = new ActorRdfJoinMultiEmpty({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should not test on no 0 cardinality', async() => {
        await expect(actor.test({
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ totalItems: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ totalItems: 15 }),
              },
              operation: <any> {},
            },
          ],
        })).rejects.toThrowError('Actor actor can only join entries where at least one is empty');
      });

      it('should test on a 0 cardinality', async() => {
        expect(await actor.test({
          entries: [
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ totalItems: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                metadata: () => Promise.resolve({ totalItems: 0 }),
              },
              operation: <any> {},
            },
          ],
        })).toEqual({ iterations: 0 });
      });
    });

    describe('getOutput', () => {
      it('should return an empty stream', async() => {
        const output = await actor.run(<any> {
          entries: [
            {
              output: <any> {
                type: 'bindings',
                variables: [],
                metadata: () => Promise.resolve({ totalItems: 10 }),
              },
              operation: <any> {},
            },
            {
              output: <any> {
                type: 'bindings',
                variables: [],
                metadata: () => Promise.resolve({ totalItems: 15 }),
              },
              operation: <any> {},
            },
          ],
        });
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
        expect(await output.metadata!()).toEqual({ totalItems: 0 });
      });
    });
  });
});
