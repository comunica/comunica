jest.unmock('follow-redirects');
import { ActorHttpNative } from '@comunica/actor-http-native';
import type { MediatorHttp, IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { KeysHttp, KeysHttpProxy } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IRequest } from '@comunica/types';
import { ActorHttpInterceptWayback } from '../lib/ActorHttpInterceptWayback';

describe('ActorHttpInterceptWayback', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpInterceptWayback instance', () => {
    let actor: ActorHttpInterceptWayback;
    let context: IActionContext;
    let mediatorHttp: MediatorHttp;

    beforeEach(() => {
      // @ts-expect-error
      mediatorHttp = {
        mediate(action: IActionHttp): Promise<IActorHttpOutput> {
          const httpNative = new ActorHttpNative({ name: 'actor-native', bus });
          return httpNative.run(action);
        },
      };
      actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
      context = new ActionContext({
        [KeysHttp.recoverBrokenLinks.name]: true,
      });
    });

    it('should always test true', async() => {
      await expect(actor.test({
        context,
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).resolves.toEqual(true);

      await expect(actor.test({
        context: context.delete(KeysHttp.recoverBrokenLinks),
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).resolves.toEqual(true);

      await expect(actor.test({
        context: context.set(KeysHttp.recoverBrokenLinks, false),
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      })).resolves.toEqual(true);
    });

    it('should return 200 on foaf when wayback machine is already the url', async() => {
      const result = await actor.run({
        context,
        input: 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf',
      });

      expect(result.status).toEqual(200);
      expect(result.url.startsWith('http://wayback.archive-it.org/')).toEqual(true);
      expect(result.url.endsWith('http://xmlns.com/foaf/spec/20140114.rdf')).toEqual(true);
    });

    it('should return 200 on foaf', async() => {
      const result = await actor.run({
        context,
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      });

      expect(result.status).toEqual(200);
      expect(result.url.startsWith('http://wayback.archive-it.org/')).toEqual(true);
      expect(result.url.endsWith('http://xmlns.com/foaf/spec/20140114.rdf')).toEqual(true);
    });

    it('should return 200 on foaf with existing proxy', async() => {
      const result = await actor.run({
        context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
        input: 'http://xmlns.com/foaf/spec/20140114.rdf',
      });

      expect(result.status).toEqual(200);
      expect(result.url).toEqual('http://xmlns.com/foaf/spec/20140114.rdf');
    });
  });
});
