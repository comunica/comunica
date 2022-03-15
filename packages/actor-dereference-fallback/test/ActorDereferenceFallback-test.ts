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

    it('should test', () => {
      // @ts-expect-error
      return expect(actor.test({})).resolves.toBeTruthy();
    });

    it('should run and throw', () => {
      return expect(actor.run({ url: 'URL', context: new ActionContext() }))
        .rejects.toThrowError('Could not dereference \'URL\'');
    });

    it('should run and log on lenient mode', async() => {
      const context = new ActionContext({ [KeysInitQuery.lenient.name]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'URL', context });
      expect(output.url).toEqual('URL');
      expect(await arrayifyStream(output.data)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
