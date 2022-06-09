import type * as CachePolicy from 'http-cache-semantics';

export interface IPolicyResponse {
  policy: CachePolicy;
  response: Response;
}
