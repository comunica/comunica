/* istanbul ignore file */
/**
 * Define all the mock fetch request and responses here
 */
export const fetchOptionsData = {
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
  responseInit: ResponseInit;
}

interface IFetchOptionData {
  requestInit?: RequestInit;
  responseInit?: ResponseInit;
}

export type FetchOptions = {
  [key in keyof typeof fetchOptionsData]: IFetchOption;
};

export function getHttpTestHelpers() {
  // @ts-expect-error
  const fo: FetchOptions = {};
  Object.entries(fetchOptionsData).forEach(([ key, fetchOptionData ]) => {
    const uri = `https://example.com/${key}`;
    fo[<keyof typeof fetchOptionsData> key] = <IFetchOption> {
      uri,
      request: new Request(uri, fetchOptionData.requestInit),
      body: key,
      response: new Response(key, fetchOptionData.responseInit),
      responseInit: fetchOptionData.responseInit,
    };
  });

  const fetch: jest.Mock<
  Promise<Response>,
  [input: RequestInfo, init?: RequestInit | undefined]
  > = jest.fn(
    async(input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const fetchOption = Object.values(fo).find(
        option => option.uri === new Request(input, init).url,
      );
      if (!fetchOption) {
        throw new Error('Test specified unknown fetch option');
      }
      return new Response(fetchOption.body, fetchOption.responseInit);
    },
  );

  return { fo, fetch };
}
