import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { ActorDereferenceFallback } from '../lib/ActorDereferenceFallback';

describe('ActorDereferenceFallback', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorDereferenceFallback instance', () => {
    let actor: ActorDereferenceFallback;

    beforeEach(() => {
      actor = new ActorDereferenceFallback({ name: 'actor', bus });
    });

    it('should test', async() => {
      // @ts-expect-error
      await expect(actor.test({})).resolves.toPassTestVoid();
    });

    it('should run and throw', async() => {
      await expect(actor.run({ url: 'URL', context: new ActionContext() }))
        .rejects.toThrow('Could not dereference \'URL\'');
    });

    it('should run and log on lenient mode', async() => {
      const context = new ActionContext({ [KeysInitQuery.lenient.name]: true });
      const spy = jest.spyOn(actor, <any> 'logWarn');
      const output = await actor.run({ url: 'URL', context });
      expect(output.url).toBe('URL');
      await expect(arrayifyStream(output.data)).resolves.toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
