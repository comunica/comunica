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
      return expect(actor.test({})).resolves.toEqual(true);
    });

    it('should run on no context', async() => {
      expect(await actor.run({})).toEqual({});
    });

    it('should run on empty context', async() => {
      expect(await actor.run({ context: ActionContext({}) })).toEqual({
        context: ActionContext({}),
      });
    });

    it('should run on context with 0 sources', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [],
        }),
      })).toEqual({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [],
        }),
      });
    });

    it('should run on context with 2 sources', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a', 'b' ],
        }),
      })).toEqual({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a', 'b' ],
        }),
      });
    });

    it('should run on context with 1 source', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a' ],
        }),
      })).toEqual({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a' ],
          [KeysRdfUpdateQuads.destination]: 'a',
        }),
      });
    });

    it('should run on context with 1 source and a destination', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a' ],
          [KeysRdfUpdateQuads.destination]: 'existing',
        }),
      })).toEqual({
        context: ActionContext({
          [KeysRdfResolveQuadPattern.sources]: [ 'a' ],
          [KeysRdfUpdateQuads.destination]: 'existing',
        }),
      });
    });
  });
});
