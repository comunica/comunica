import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessConvertShortcuts } from '../lib/ActorContextPreprocessConvertShortcuts';

describe('ActorContextPreprocessConvertShortcuts', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessConvertShortcuts instance', () => {
    let actor: ActorContextPreprocessConvertShortcuts;

    beforeEach(() => {
      actor = new ActorContextPreprocessConvertShortcuts({
        name: 'actor',
        bus,
        contextKeyShortcuts: {
          sources: '@comunica/actor-init-query:querySourcesUnidentified',
          destination: '@comunica/bus-rdf-update-quads:destination',
          initialBindings: '@comunica/actor-init-query:initialBindings',
        },
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(contextIn);
      });

      it('with a non-empty context', async() => {
        const contextIn = new ActionContext({
          sources: [ 'a' ],
          destination: 'd',
          initialBindings: { bindings: true },
          other: true,
        });
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(new ActionContext({
          '@comunica/actor-init-query:querySourcesUnidentified': [ 'a' ],
          '@comunica/bus-rdf-update-quads:destination': 'd',
          '@comunica/actor-init-query:initialBindings': { bindings: true },
          other: true,
        }));
      });
    });
  });
});
