import type { IActionContext } from '@comunica/types';

/**
 * Can modify a fetch init object.
 */
export interface IFetchInitPreprocessor {
  handle: (init: RequestInit, context: IActionContext) => Promise<RequestInit>;
}
