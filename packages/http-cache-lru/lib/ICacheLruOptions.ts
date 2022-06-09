import type { Response } from 'cross-fetch';
import { fetch } from 'cross-fetch';
import type { Options } from 'lru-cache';
import type IPolicyResponse from './IPolicyResponse';

export default interface ICacheLruOptions {
  lruOptions?: Options<string, IPolicyResponse>;
  fetch?: (
    input: RequestInfo,
    init?: RequestInit | undefined
  ) => Promise<Response>;
}

export function applyCacheLruOptionsDefaults(
  options?: ICacheLruOptions,
): Required<ICacheLruOptions> {
  return {
    lruOptions: options?.lruOptions || { max: 100 },
    fetch: options?.fetch || fetch,
  };
}
