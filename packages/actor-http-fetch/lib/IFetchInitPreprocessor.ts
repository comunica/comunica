/**
 * Can modify a fetch init object.
 */
export interface IFetchInitPreprocessor {
  handle: (init: RequestInit) => Promise<RequestInit>;
}
