import {ActorHttp} from "@comunica/bus-http";
import {Bus} from "@comunica/core";
import {ActionContext} from "@comunica/core";
import "isomorphic-fetch";
import {ActorHttpProxy, KEY_CONTEXT_HTTPPROXYHANDLER} from "../lib/ActorHttpProxy";
import {ProxyHandlerStatic} from "../lib/ProxyHandlerStatic";

describe('ActorHttpProxy', () => {
  let bus;
  let mediatorHttp;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
      expect(() => { (<any> ActorHttpProxy)(); }).toThrow();
    });
  });

  describe('An ActorHttpProxy instance', () => {
    let actor: ActorHttpProxy;
    let context;

    beforeEach(() => {
      actor = new ActorHttpProxy({ name: 'actor', bus, mediatorHttp });
      context = ActionContext({
        [KEY_CONTEXT_HTTPPROXYHANDLER]: new ProxyHandlerStatic('http://proxy.org/'),
      });
    });

    it('should test on a valid proxy handler', () => {
      const input = 'http://example.org';
      return expect(actor.test({ input, context })).resolves.toEqual({ time: Infinity });
    });

    it('should not test on a no proxy handler', () => {
      const input = 'http://example.org';
      return expect(actor.test({ input, context: ActionContext({}) })).rejects
        .toThrow(new Error('Actor actor could not find a proxy handler in the context.'));
    });

    it('should not test on an invalid proxy handler', () => {
      const input = 'http://example.org';
      context = ActionContext({
        [KEY_CONTEXT_HTTPPROXYHANDLER]: { getProxy: () => null },
      });
      return expect(actor.test({ input, context })).rejects
        .toThrow(new Error('Actor actor could not determine a proxy for the given request.'));
    });

    it('should run when the proxy does not return an x-final-url header', async () => {
      const input = 'http://example.org/';
      expect(await actor.run({ input, context }))
        .toEqual({ url: 'http://example.org/', output: 'ABC', headers: new Headers({}) });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        { input: 'http://proxy.org/http://example.org/', context: ActionContext({}) });
    });

    it('should run when the proxy does return an x-final-url header', async () => {
      const input = 'http://example.org/';
      const headers = new Headers({ 'x-final-url': 'http://example.org/redirected/' });
      mediatorHttp.mediate = jest.fn((args) => {
        return { output: 'ABC', headers };
      });
      expect(await actor.run({ input, context }))
        .toEqual({ url: 'http://example.org/redirected/', output: 'ABC', headers });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        { input: 'http://proxy.org/http://example.org/', context: ActionContext({}) });
    });

    it('should run on a request input', async () => {
      const input = new Request('http://example.org/');
      expect(await actor.run({ input, context }))
        .toEqual({ url: 'http://example.org/', output: 'ABC', headers: new Headers({}) });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        { input: new Request('http://proxy.org/http://example.org/'), context: ActionContext({}) });
    });
  });
});
