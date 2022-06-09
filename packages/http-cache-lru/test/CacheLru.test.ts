import { CacheLru } from "../lib/CacheLru";
import { Request, Response } from "cross-fetch";

/**
 * Define all the mock fetch request and responses here
 */
const fetchOptionsData = {
  plain: {} as FetchOptionData,
  maxAge: {
    responseInit: {
      headers: {
        "cache-control": "max-age=604800",
      },
    },
  } as FetchOptionData,
  eTag: {
    responseInit: {
      headers: {
        etag: "123456",
      },
    },
  } as FetchOptionData,
  noStore: {
    responseInit: {
      headers: {
        "cache-control": "no-store",
      },
    },
  } as FetchOptionData,
};

interface FetchOption {
  uri: string;
  request: Request;
  body: string;
  response: Response;
}

interface FetchOptionData {
  requestInit?: RequestInit;
  responseInit?: ResponseInit;
}

type FetchOptions = {
  [key in keyof typeof fetchOptionsData]: FetchOption;
};

describe("CacheLru", () => {
  let fetch: jest.Mock<
    Promise<Response>,
    [input: RequestInfo, init?: RequestInit | undefined]
  >;
  let cacheLru: CacheLru;
  let fo: FetchOptions;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    fo = {};
    Object.entries(fetchOptionsData).forEach(([key, fetchOptionData]) => {
      const uri = `https://example.com/${key}`;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fo[key] = {
        uri: uri,
        request: new Request(uri, fetchOptionData.requestInit),
        body: key,
        response: new Response(key, fetchOptionData.responseInit),
      };
    });

    fetch = jest.fn(
      async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
        const fetchOption = Object.values(fo).find(
          (option) => option.uri === new Request(input, init).url
        );
        if (!fetchOption) {
          throw Error("Test specified unknown fetch option");
        }
        return fetchOption.response;
      }
    );
    cacheLru = new CacheLru({ fetch });
  });

  describe("put", () => {
    it("puts a response that should be valid", async () => {
      await cacheLru.put(fo.maxAge.request, fo.maxAge.response);
      const cachedResponse = await cacheLru.match(fo.maxAge.request);
      expect(await cachedResponse?.text()).toBe(fo.maxAge.body);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("puts a response that should be valid", async () => {
      await cacheLru.put(fo.plain.request, fo.plain.response);
      const keys = await cacheLru.keys();
      expect(keys.some((key) => key.url === fo.plain.uri)).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("throws an error when trying to add an invalid request", async () => {
      await expect(
        cacheLru.put(fo.noStore.request, fo.noStore.response)
      ).rejects.toThrow(`${fo.noStore.uri} is not storable.`);
    });
  });

  describe("match", () => {
    it("performs a fetch when there is nothing in the cache.", async () => {
      await cacheLru.match(fo.maxAge.request);
      expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("does not perform a fetch when the cache is not stale", async () => {
      const matchResult1 = await cacheLru.match(fo.maxAge.request);
      expect(await matchResult1?.text()).toBe(fo.maxAge.body);
      const matchResult2 = await cacheLru.match(fo.maxAge.request);
      expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await matchResult2?.text()).toBe(fo.maxAge.body);
    });

    it("performs a fetch when the cache is stale", async () => {
      await cacheLru.match(fo.plain.request);
      await cacheLru.match(fo.plain.request);
      expect(fetch).toHaveBeenCalledWith(fo.plain.request);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("makes a request with the proper headers when an etag is present", async () => {
      const matchResult1 = await cacheLru.match(fo.eTag.request);
      expect(fetch).toHaveBeenCalledWith(fo.eTag.request);
      expect(await matchResult1?.text()).toBe(fo.eTag.body);
      fetch.mockClear();
      fetch.mockResolvedValueOnce(
        new Response("Distraction Body that should not be set", {
          status: 304,
          headers: {
            etag: "123456",
          },
        })
      );
      const matchResult2 = await cacheLru.match(fo.eTag.request);
      expect(fetch).toHaveBeenCalledWith(
        new Request(fo.eTag.uri, {
          headers: {
            "if-none-match": "123456",
          },
        })
      );
      expect(await matchResult2?.text()).toBe(fo.eTag.body);
      fetch.mockClear();
      fetch.mockResolvedValueOnce(
        new Response("The body should be reset to this", {
          status: 200,
          headers: {
            etag: "7890",
          },
        })
      );
      const matchResult3 = await cacheLru.match(fo.eTag.request);
      expect(fetch).toHaveBeenCalledWith(
        new Request(fo.eTag.uri, {
          headers: {
            "if-none-match": "123456",
          },
        })
      );
      expect(await matchResult3?.text()).toBe(
        "The body should be reset to this"
      );
    });
  });

  describe("Not implemented methods", () => {
    it("Thows not implemented on add", async () => {
      await expect(cacheLru.add(fo.plain.request)).rejects.toThrow(
        "Not Implemented"
      );
    });

    it("Thows not implemented on addAll", async () => {
      await expect(cacheLru.addAll([fo.plain.request])).rejects.toThrow(
        "Not Implemented"
      );
    });

    it("Thows not implemented on matchAll", async () => {
      await expect(cacheLru.matchAll(fo.plain.request)).rejects.toThrow(
        "Not Implemented"
      );
    });
  });

  describe("delete", () => {
    it("Deletes a request", async () => {
      await cacheLru.put(fo.plain.request, fo.plain.response);
      const keys1 = await cacheLru.keys();
      expect(keys1.some((key) => key.url === fo.plain.uri)).toBe(true);
      await cacheLru.delete(fo.plain.request);
      const keys2 = await cacheLru.keys();
      expect(keys2.some((key) => key.url === fo.plain.uri)).toBe(false);
    });
  });

  describe("constructor", () => {
    it("applies different cache configurations", async () => {
      const newCache = new CacheLru({ lruOptions: { max: 1 } });
      await newCache.put(fo.maxAge.request, fo.maxAge.response);
      await newCache.put(fo.eTag.request, fo.eTag.response);
      expect((await newCache.keys()).length).toBe(1);
    });

    it("applies default options", async () => {
      new CacheLru();
    });
  });
});
