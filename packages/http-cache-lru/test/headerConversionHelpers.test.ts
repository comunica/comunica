import { Headers as HeaderHash } from "http-cache-semantics";
import { addHashHeadersToObject } from "../lib/headerConversionHelpers";
import { Request } from "cross-fetch";

describe("headerConversionhelpers", () => {
  describe("addHashHeadersToObject", () => {
    it("Sets the header when there is an array value", () => {
      const hashHeaders: HeaderHash = {
        a: ["b", "c", "d"],
      };
      const request = new Request("https://example.com");
      addHashHeadersToObject(hashHeaders, request);
      expect(request.headers.get("a")).toBe("b, c, d");
    });
  });
});
