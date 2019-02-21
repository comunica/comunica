import {IActorArgs, IActorTest} from "@comunica/core";
import {ActorHttpInvalidate, IActionHttpInvalidate, IActorHttpInvalidateOutput} from "./ActorHttpInvalidate";

/**
 * An ActorHttpInvalidate actor that allows listeners to be attached.
 *
 * @see ActorHttpInvalidate
 */
export class ActorHttpInvalidateListenable extends ActorHttpInvalidate {

  private readonly invalidateListeners: IInvalidateListener[];

  constructor(args: IActorArgs<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>) {
    super(args);
    this.invalidateListeners = [];
  }

  public addInvalidateListener(listener: IInvalidateListener) {
    this.invalidateListeners.push(listener);
  }

  public async test(action: IActionHttpInvalidate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionHttpInvalidate): Promise<IActorHttpInvalidateOutput> {
    for (const listener of this.invalidateListeners) {
      listener(action);
    }
    return true;
  }

}

/**
 * Called when a {@link IActionHttpInvalidate} is received.
 */
export type IInvalidateListener = (action: IActionHttpInvalidate) => void;
