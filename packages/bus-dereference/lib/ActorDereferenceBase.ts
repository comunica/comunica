import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Readable } from 'readable-stream';
import type { IActorDereferenceOutput, IActionDereference } from './ActorDereference';

export function emptyReadable<S extends Readable>(): S {
  const data = new Readable();
  data.push(null);
  return <S> data;
}

/**
 * Check if hard errors should occur on HTTP or parse errors.
 * @param {IActionContext} context An action context.
 * @return {boolean} If hard errors are enabled.
 */
export function isHardError(context: IActionContext): boolean {
  return !context.get(KeysInitQuery.lenient);
}

/**
 * If a warning should be emitted for the given type of error.
 * @param error An error.
 */
export function shouldLogWarning(error: Error): boolean {
  return error.name !== 'AbortError';
}

/**
 * A base actor for dereferencing URLs to (generic) streams.
 *
 * Actor types:
 * * Input:  IActionDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorDereferenceOutput: A Readable stream
 *
 * @see IActionDereference
 * @see IActorDereferenceOutput
 */
export abstract class ActorDereferenceBase<
  I extends IActionDereference,
T extends IActorTest,
O extends IActorDereferenceOutput,
TS = undefined,
>
  extends Actor<I, T, O, TS> {
  public constructor(args: IActorArgs<I, T, O, TS>) {
    super(args);
  }

  /**
   * Handle the given error as a rejection or delegate it to the logger,
   * depending on whether or not hard errors are enabled.
   * @param {I} action An action.
   * @param {Error} error An error that has occurred.
   * @param {N} output Data to add to the output
   */
  protected async dereferenceErrorHandler<N, M extends Readable>(
    action: I,
    error: unknown,
    output: N,
  ): Promise<N & { data: M }> {
    if (isHardError(action.context)) {
      throw error;
    }
    if (shouldLogWarning(<Error> error)) {
      this.logWarn(action.context, (<Error>error).message, () => ({ url: action.url }));
    }
    return { ...output, data: emptyReadable<M>() };
  }
}
