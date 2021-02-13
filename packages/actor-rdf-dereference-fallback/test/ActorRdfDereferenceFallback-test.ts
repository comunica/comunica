import { KEY_CONTEXT_LENIENT } from '@comunica/bus-rdf-dereference';
import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfDereferenceFallback } from '../lib/ActorRdfDereferenceFallback';
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfDereferenceFallback', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfDereferenceFallback instance', () => {
    let actor: ActorRdfDereferenceFallback;

    beforeEach(() => {
      actor = new ActorRdfDereferenceFallback({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test(<any> {})).resolves.toBeTruthy();
    });

    it('should run and throw', () => {
      return expect(actor.run({ url: 'URL' })).rejects.toThrowError('Could not dereference \'URL\'');
    });

    it('should run and log on lenient mode', async() => {
      const context = ActionContext({ [KEY_CONTEXT_LENIENT]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'URL', context });
      expect(output.url).toEqual('URL');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
