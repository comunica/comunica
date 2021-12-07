import { KeysRdfResolveQuadPattern, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessSourceToDestination } from '../lib/ActorContextPreprocessSourceToDestination';

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

    it('should test', () => {
      return expect(actor.test({ context: new ActionContext() })).resolves.toEqual(true);
    });

    it('should run on no context', async() => {
      expect(await actor.run({ context: new ActionContext() })).toEqual({ context: new ActionContext() });
    });

    it('should run on empty context', async() => {
      expect(await actor.run({ context: new ActionContext() })).toEqual({
        context: new ActionContext({}),
      });
    });

    it('should run on context with 0 sources', async() => {
      expect(await actor.run({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [],
        }),
      })).toEqual({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [],
        }),
      });
    });

    it('should run on context with 2 sources', async() => {
      expect(await actor.run({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a', 'b' ],
        }),
      })).toEqual({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a', 'b' ],
        }),
      });
    });

    it('should run on context with 1 source', async() => {
      expect(await actor.run({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a' ],
        }),
      })).toEqual({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'a',
        }),
      });
    });

    it('should run on context with 1 source and a destination', async() => {
      expect(await actor.run({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'existing',
        }),
      })).toEqual({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'a' ],
          [KeysRdfUpdateQuads.destination.name]: 'existing',
        }),
      });
    });
  });
});
