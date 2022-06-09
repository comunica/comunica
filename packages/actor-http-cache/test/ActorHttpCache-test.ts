import { KeysHttp } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import { Request, Response } from 'cross-fetch';
import { ActorHttpCache } from '../lib/ActorHttpCache';

/**
 * Define all the mock fetch request and responses here
 */
const fetchOptionsData = {
  plain: <IFetchOptionData> {},
  maxAge: <IFetchOptionData> {
    responseInit: {
      headers: {
        'cache-control': 'max-age=604800',
      },
    },
  },
  eTag: <IFetchOptionData> {
    responseInit: {
      headers: {
        etag: '123456',
      },
    },
  },
  noStore: <IFetchOptionData> {
    responseInit: {
      headers: {
        'cache-control': 'no-store',
      },
    },
  },
};

interface IFetchOption {
  uri: string;
  request: Request;
  body: string;
  response: Response;
}

interface IFetchOptionData {
  requestInit?: RequestInit;
  responseInit?: ResponseInit;
}

type FetchOptions = {
  [key in keyof typeof fetchOptionsData]: IFetchOption;
};

describe('ActorHttpCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpCache instance', () => {
    let actor: ActorHttpCache;
    let fetch: jest.Mock<
    Promise<Response>,
    [input: RequestInfo, init?: RequestInit | undefined]
    >;
    let fo: FetchOptions;

    beforeEach(() => {
      // @ts-expect-error
      fo = {};
      Object.entries(fetchOptionsData).forEach(([ key, fetchOptionData ]) => {
        const uri = `https://example.com/${key}`;
        fo[<keyof typeof fetchOptionsData> key] = <IFetchOption> {
          uri,
          request: new Request(uri, fetchOptionData.requestInit),
          body: key,
          response: new Response(key, fetchOptionData.responseInit),
        };
      });

      fetch = jest.fn(
        async(input: RequestInfo, init?: RequestInit): Promise<Response> => {
          const fetchOption = Object.values(fo).find(
            option => option.uri === new Request(input, init).url,
          );
          if (!fetchOption) {
            throw new Error('Test specified unknown fetch option');
          }
          return fetchOption.response;
        },
      );

      actor = new ActorHttpCache({ name: 'actor', bus });
    });

    it('has a test return infinity if the request is not in the chache', async() => {
      expect(
        await actor.test({ input: fo.plain.uri, context: new ActionContext({}) }),
      ).toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('fetches the document and caches it', async() => {
      const result1 = await actor.run({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      });
      expect(await result1.text()).toBe(fo.maxAge.body);
      const result2 = await actor.run({ input: fo.maxAge.uri, context: new ActionContext({}) });
      expect(await result2.text()).toBe(fo.maxAge.body);
    });

    it('has an item return 1 if an item is in the cache', async() => {
      await actor.run({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      });
      expect(await actor.test({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      })).toEqual({ time: 1 });
    });
  });
});
