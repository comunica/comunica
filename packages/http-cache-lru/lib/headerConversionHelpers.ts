import {
  Headers as HeaderHash,
  Request as CacheRequest,
  Response as CacheResponse,
} from "http-cache-semantics";
import { Request, Response, Headers } from "cross-fetch";

/**
 * Convert a request into the old version of the request that doesn't use the
 * Headers object
 * @param request the request
 * @returns A request that has hash header
 */
export function requestToRequestWithHashHeaders(
  request: Request
): CacheRequest {
  return { ...request, headers: headersToHash(request.headers) };
}

/**
 * Convert a response into the old version of the response that doesn't use
 * the Headers object
 * @param response the response
 * @returns A response that has hash header
 */
export function responseToRequestWithHashHeaders(
  response: Response
): CacheResponse {
  return { ...response, headers: headersToHash(response.headers) };
}

/**
 * Convert the given headers object into a raw hash.
 * @param headers A headers object.
 */
export function headersToHash(headers: Headers): HeaderHash {
  const hash: HeaderHash = {};
  headers.forEach((value, key) => {
    hash[key] = value;
  });
  return hash;
}

/**
 * Converts a header hash into a standard header
 * @param hash the hash to be converted into a header
 */
export function addHashHeadersToObject(
  hash: HeaderHash,
  reqRes: Request | Response
): void {
  Object.entries(hash).forEach(([headerKey, headerValue]) => {
    if (headerValue) {
      if (Array.isArray(headerValue)) {
        headerValue.forEach((value, index) => {
          if (index === 0) {
            reqRes.headers.set(headerKey, value);
          } else {
            reqRes.headers.append(headerKey, value);
          }
        });
      } else {
        reqRes.headers.set(headerKey, headerValue);
      }
    }
  });
}
