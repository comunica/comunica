/* eslint-disable unicorn/filename-case */
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Does nothing in browsers
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  public handle(init: RequestInit): RequestInit {
    return { keepalive: true, ...init };
  }
}
