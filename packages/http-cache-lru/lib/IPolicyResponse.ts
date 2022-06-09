import type * as CachePolicy from 'http-cache-semantics';

export default interface IPolicyResponse {
  policy: CachePolicy;
  response: Response;
}
