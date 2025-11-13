export interface ICacheResponseHead {
  /**
   * The HTTP status code.
   */
  status: number;
  /**
   * The returned headers of the final URL.
   */
  headers?: Headers;
}
