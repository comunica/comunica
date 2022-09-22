import type { MediatorHttp, IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { KeysHttpInterceptWayback, KeysHttpProxy } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IProxyHandler, IRequest } from '@comunica/types';
import { Request } from 'cross-fetch';
import { ActorHttpInterceptWayback } from '../lib/ActorHttpInterceptWayback';
const stringToStream = require('streamify-string');

describe('ActorHttpInterceptWayback', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpInterceptWayback instance', () => {
    let actor: ActorHttpInterceptWayback;
    let context: IActionContext;
    let mediatorHttp: MediatorHttp;

    describe('404 foaf, 200 wayback', () => {
      beforeEach(() => {
        // @ts-expect-error
        mediatorHttp = {
          async mediate(action: IActionHttp): Promise<IActorHttpOutput> {
            const { input, init } =
              await action.context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler)?.getProxy(action) ??
              action;

            const request = new Request(input, init);

            if (request.url === 'http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 404,
                url: request.url,
              };
            }

            if (request.url === 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 200,
                url: request.url,
              };
            }

            throw new Error('Unexpected URL');
          },
        };
        actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
        context = new ActionContext({
          [KeysHttpInterceptWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('should always test true', async() => {
        await expect(actor.test({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.delete(KeysHttpInterceptWayback.recoverBrokenLinks),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.set(KeysHttpInterceptWayback.recoverBrokenLinks, false),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);
      });

      it('should return 200 on foaf when wayback machine is already the url', async() => {
        const result = await actor.run({
          context,
          input: 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });

      it('should return 200 on foaf', async() => {
        const result = await actor.run({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });

      it('should return 200 on foaf with existing proxy', async() => {
        const result = await actor.run({
          context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });
    });

    describe('404 foaf with body, 200 wayback', () => {
      beforeEach(() => {
        // @ts-expect-error
        mediatorHttp = {
          async mediate(action: IActionHttp): Promise<IActorHttpOutput> {
            const { input, init } =
              await action.context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler)?.getProxy(action) ??
              action;

            const request = new Request(input, init);

            if (request.url === 'http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> <unknown> {
                status: 404,
                body: stringToStream('page not found'),
                url: request.url,
              };
            }

            if (request.url === 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 200,
                url: request.url,
              };
            }

            throw new Error('Unexpected URL');
          },
        };
        actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
        context = new ActionContext({
          [KeysHttpInterceptWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('should always test true', async() => {
        await expect(actor.test({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.delete(KeysHttpInterceptWayback.recoverBrokenLinks),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.set(KeysHttpInterceptWayback.recoverBrokenLinks, false),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);
      });

      it('should return 200 on foaf when wayback machine is already the url', async() => {
        const result = await actor.run({
          context,
          input: 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });

      it('should return 200 on foaf', async() => {
        const result = await actor.run({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });

      it('should return 200 on foaf with existing proxy', async() => {
        const result = await actor.run({
          context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf');
      });
    });

    describe('200 foaf, 200 wayback', () => {
      beforeEach(() => {
        // @ts-expect-error
        mediatorHttp = {
          async mediate(action: IActionHttp): Promise<IActorHttpOutput> {
            const { input, init } =
              await action.context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler)?.getProxy(action) ??
              action;

            const request = new Request(input, init);

            if (request.url === 'http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 200,
                url: request.url,
              };
            }

            if (request.url === 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 200,
                url: request.url,
              };
            }

            throw new Error('Unexpected URL');
          },
        };
        actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
        context = new ActionContext({
          [KeysHttpInterceptWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('should always test true', async() => {
        await expect(actor.test({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.delete(KeysHttpInterceptWayback.recoverBrokenLinks),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.set(KeysHttpInterceptWayback.recoverBrokenLinks, false),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);
      });

      it('should return foaf url when foaf is 200', async() => {
        const result = await actor.run({
          context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://xmlns.com/foaf/spec/20140114.rdf');
      });
    });

    describe('200 foaf, 404 wayback', () => {
      beforeEach(() => {
        // @ts-expect-error
        mediatorHttp = {
          async mediate(action: IActionHttp): Promise<IActorHttpOutput> {
            const { input, init } =
              await action.context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler)?.getProxy(action) ??
              action;

            const request = new Request(input, init);

            if (request.url === 'http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 200,
                url: request.url,
              };
            }

            if (request.url === 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 404,
                url: request.url,
              };
            }

            throw new Error('Unexpected URL');
          },
        };
        actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
        context = new ActionContext({
          [KeysHttpInterceptWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('should always test true', async() => {
        await expect(actor.test({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.delete(KeysHttpInterceptWayback.recoverBrokenLinks),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.set(KeysHttpInterceptWayback.recoverBrokenLinks, false),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);
      });

      it('should return foaf url when foaf is 200', async() => {
        const result = await actor.run({
          context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(200);
        expect(result.url).toEqual('http://xmlns.com/foaf/spec/20140114.rdf');
      });
    });

    describe('404 foaf, 404 wayback', () => {
      beforeEach(() => {
        // @ts-expect-error
        mediatorHttp = {
          async mediate(action: IActionHttp): Promise<IActorHttpOutput> {
            const { input, init } =
              await action.context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler)?.getProxy(action) ??
              action;

            const request = new Request(input, init);

            if (request.url === 'http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 404,
                url: request.url,
              };
            }

            if (request.url === 'http://wayback.archive-it.org/http://xmlns.com/foaf/spec/20140114.rdf') {
              return <Response> {
                status: 404,
                url: request.url,
              };
            }

            throw new Error('Unexpected URL');
          },
        };
        actor = new ActorHttpInterceptWayback({ name: 'actor', bus, mediatorHttp });
        context = new ActionContext({
          [KeysHttpInterceptWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('should always test true', async() => {
        await expect(actor.test({
          context,
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.delete(KeysHttpInterceptWayback.recoverBrokenLinks),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);

        await expect(actor.test({
          context: context.set(KeysHttpInterceptWayback.recoverBrokenLinks, false),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        })).resolves.toEqual(true);
      });

      it('should return foaf url when wayback gives a 404', async() => {
        const result = await actor.run({
          context: context.set(KeysHttpProxy.httpProxyHandler, { async getProxy(url: IRequest) { return url; } }),
          input: 'http://xmlns.com/foaf/spec/20140114.rdf',
        });

        expect(result.status).toEqual(404);
        expect(result.url).toEqual('http://xmlns.com/foaf/spec/20140114.rdf');
      });
    });
  });
});
