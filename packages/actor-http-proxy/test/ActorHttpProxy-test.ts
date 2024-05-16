import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpProxy } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import 'cross-fetch/polyfill';
import type { IActionContext } from '@comunica/types';
import { ActorHttpProxy } from '../lib/ActorHttpProxy';
import { ProxyHandlerStatic } from '../lib/ProxyHandlerStatic';

describe('ActorHttpProxy', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorHttp: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorHttp = {
      mediate: jest.fn((args) => {
        return { output: 'ABC', headers: new Headers({}) };
      }),
    };
  });

  describe('The ActorHttpProxy module', () => {
    it('should be a function', () => {
      expect(ActorHttpProxy).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpProxy constructor', () => {
      expect(new (<any> ActorHttpProxy)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpProxy);
      expect(new (<any> ActorHttpProxy)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpProxy objects without \'new\'', () => {
      expect(() => {
        (<any> ActorHttpProxy)();
      }).toThrow(`Class constructor ActorHttpProxy cannot be invoked without 'new'`);
    });
  });

  describe('An ActorHttpProxy instance', () => {
    let actor: ActorHttpProxy;

    beforeEach(() => {
      actor = new ActorHttpProxy({ name: 'actor', bus, mediatorHttp });
      context = new ActionContext({
        [KeysHttpProxy.httpProxyHandler.name]: new ProxyHandlerStatic('http://proxy.org/'),
      });
    });

    it('should test on a valid proxy handler', async() => {
      const input = 'http://example.org';
      await expect(actor.test({ input, context })).resolves.toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('should not test on a no proxy handler', async() => {
      const input = 'http://example.org';
      await expect(actor.test({ input, context: new ActionContext({}) })).rejects
        .toThrow(new Error('Actor actor could not find a proxy handler in the context.'));
    });

    it('should not test on an invalid proxy handler', async() => {
      const input = 'http://example.org';
      context = new ActionContext({
        [KeysHttpProxy.httpProxyHandler.name]: { getProxy: () => null },
      });
      await expect(actor.test({ input, context })).rejects
        .toThrow(new Error('Actor actor could not determine a proxy for the given request.'));
    });

    it('should run when the proxy does not return an x-final-url header', async() => {
      const input = 'http://example.org/';
      await expect(actor.run({ input, context })).resolves
        .toEqual({ url: 'http://example.org/', output: 'ABC', headers: new Headers({}) });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        { input: 'http://proxy.org/http://example.org/', context: new ActionContext({}) },
      );
    });

    it('should run when the proxy does return an x-final-url header', async() => {
      const input = 'http://example.org/';
      const headers = new Headers({ 'x-final-url': 'http://example.org/redirected/' });
      jest.spyOn(mediatorHttp, 'mediate').mockImplementation((args) => {
        return { output: 'ABC', headers };
      });
      await expect(actor.run({ input, context })).resolves
        .toEqual({ url: 'http://example.org/redirected/', output: 'ABC', headers });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        { input: 'http://proxy.org/http://example.org/', context: new ActionContext({}) },
      );
    });

    it('should run on a request input', async() => {
      const input = new Request('http://example.org/');
      await expect(actor.run({ input, context })).resolves
        .toEqual({ url: 'http://example.org/', output: 'ABC', headers: new Headers({}) });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        {
          input: expect.objectContaining({
            url: 'http://proxy.org/http://example.org/',
          }),
          context: new ActionContext({}),
        },
      );
    });
  });
});
