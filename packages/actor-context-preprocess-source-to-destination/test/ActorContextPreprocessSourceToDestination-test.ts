import { ActionContext, Bus } from '@comunica/core';
import {
  ActorContextPreprocessSourceToDestination, KEY_CONTEXT_DESTINATION,
  KEY_CONTEXT_SOURCES,
} from '../lib/ActorContextPreprocessSourceToDestination';

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
          [KEY_CONTEXT_SOURCES]: [],
        }),
      })).toEqual({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [],
        }),
      });
    });

    it('should run on context with 2 sources', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a', 'b' ],
        }),
      })).toEqual({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a', 'b' ],
        }),
      });
    });

    it('should run on context with 1 source', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a' ],
        }),
      })).toEqual({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a' ],
          [KEY_CONTEXT_DESTINATION]: 'a',
        }),
      });
    });

    it('should run on context with 1 source and a destination', async() => {
      expect(await actor.run({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a' ],
          [KEY_CONTEXT_DESTINATION]: 'existing',
        }),
      })).toEqual({
        context: ActionContext({
          [KEY_CONTEXT_SOURCES]: [ 'a' ],
          [KEY_CONTEXT_DESTINATION]: 'existing',
        }),
      });
    });
  });
});
