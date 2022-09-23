import { KeysInitQuery } from '@comunica/context-entries';
import type { IAction, IActorArgs, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Readable } from 'readable-stream';
import type { IActorDereferenceOutput } from '.';

export function emptyReadable<S extends Readable>(): S {
  const data = new Readable();
  data.push(null);
  return <S> data;
}

/**
 * Check if hard errors should occur on HTTP or parse errors.
 * @param {IActionDereference} action A dereference action.
 * @return {boolean} If hard errors are enabled.
 */
export function isHardError(context: IActionContext): boolean {
  return !context.get(KeysInitQuery.lenient);
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
export abstract class ActorDereferenceBase<I extends IAction, T extends IActorTest, O extends IActorDereferenceOutput>
  extends Actor<I, T, O> {
  public constructor(args: IActorArgs<I, T, O>) {
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
    this.logError(action.context, (<Error> error).message);
    return { ...output, data: emptyReadable<M>() };
  }
}
