import type { IActionContext } from '@comunica/types';

/**
 * Can modify a fetch init object.
 */
export interface IFetchInitPreprocessor {
  /**
   * Preprocesses a fetch request init, potentially modifying headers, agents, or other options.
   * @param init The request init object to preprocess.
   * @param context The action context.
   * @return The preprocessed request init.
   */
  handle: (init: RequestInit, context: IActionContext) => Promise<RequestInit>;
}
