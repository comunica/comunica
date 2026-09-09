import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';

/**
 * A callback function to execute custom SERVICE clauses.
 *
 * @param operation The service algebra operation.
 * @param bindingsStream The input bindings stream to join or process (if available).
 * @param context The current action context.
 * @returns A stream of output bindings.
 */
export type ServiceExecutorCallback = (
  operation: any,
  bindingsStream: BindingsStream | undefined,
  context: IActionContext,
) => Promise<BindingsStream> | BindingsStream;
