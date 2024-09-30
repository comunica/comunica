import { KeysInitQuery, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessSourceToDestination } from '../lib/ActorContextPreprocessSourceToDestination';
import '@comunica/utils-jest';

describe('ActorContextPreprocessSourceToDestination', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessSourceToDestination instance', () => {
    let actor: ActorContextPreprocessSourceToDestination;

    beforeEach(() => {
      actor = new ActorContextPreprocessSourceToDestination({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toPassTestVoid();
    });

    it('should run on no context', async() => {
      await expect(actor.run({ context: new ActionContext() })).resolves.toEqual({ context: new ActionContext() });
    });

    it('should run on empty context', async() => {
      await expect(actor.run({ context: new ActionContext() })).resolves.toEqual({
        context: new ActionContext({}),
      });
    });

    it('should run on context with 0 sources', async() => {
      await expect(actor.run({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [],
        }),
      })).resolves.toEqual({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [],
        }),
      });
    });

    it('should run on context with 2 sources', async() => {
      await expect(actor.run({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a', 'b' ],
        }),
      })).resolves.toEqual({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a', 'b' ],
        }),
      });
    });

    it('should run on context with 1 source', async() => {
      await expect(actor.run({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a' ],
        }),
      })).resolves.toEqual({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'a',
        }),
      });
    });

    it('should run on context with 1 source and a destination', async() => {
      await expect(actor.run({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'existing',
        }),
      })).resolves.toEqual({
        context: new ActionContext({
          [KeysInitQuery.querySourcesUnidentified.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'existing',
        }),
      });
    });
  });
});
