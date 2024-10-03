import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IActionHttpInvalidate,
  IActorHttpInvalidateOutput,
  IActorHttpInvalidateArgs,
} from './ActorHttpInvalidate';
import { ActorHttpInvalidate } from './ActorHttpInvalidate';

/**
 * An ActorHttpInvalidate actor that allows listeners to be attached.
 *
 * @see ActorHttpInvalidate
 */
export class ActorHttpInvalidateListenable extends ActorHttpInvalidate {
  private readonly invalidateListeners: IInvalidateListener[] = [];

  public constructor(args: IActorHttpInvalidateArgs) {
    super(args);
    this.invalidateListeners = [];
  }

  public addInvalidateListener(listener: IInvalidateListener): void {
    this.invalidateListeners.push(listener);
  }

  public async test(_action: IActionHttpInvalidate): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionHttpInvalidate): Promise<IActorHttpInvalidateOutput> {
    for (const listener of this.invalidateListeners) {
      listener(action);
    }
    return {};
  }
}

/**
 * Called when a {@link IActionHttpInvalidate} is received.
 */
export type IInvalidateListener = (action: IActionHttpInvalidate) => void;
