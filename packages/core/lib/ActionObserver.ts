import type { Actor, IAction, IActorOutput, IActorTest } from './Actor';
import type { Bus } from './Bus';

/**
 * An ActionObserver can passively listen to {@link Actor#run} inputs and outputs for all actors on a certain bus.
 *
 * ActionObserver should not edit inputs and outputs,
 * they should be considered immutable.
 *
 * @see Actor
 * @see Bus
 *
 * @template I The input type of an actor.
 * @template O The output type of an actor.
 * @template TS The test side data type.
 */
export abstract class ActionObserver<I extends IAction, O extends IActorOutput, TS = undefined> {
  public readonly name: string;
  public readonly bus: Bus<Actor<I, IActorTest, O, TS>, I, IActorTest, O, TS>;

  /**
   * All enumerable properties from the `args` object are inherited to this observer.
   *
   * The observer will NOT automatically subscribe to the given bus when this constructor is called.
   *
   * @param {IActionObserverArgs<I extends IAction, O extends IActorOutput>} args Arguments object
   * @throws When required arguments are missing.
   */
  protected constructor(args: IActionObserverArgs<I, O>) {
    Object.assign(this, args);
  }

  /**
   * Invoked when an action was run by an actor.
   *
   * @param actor               The action on which the {@link Actor#run} method was invoked.
   * @param {I}          action The original action input.
   * @param {Promise<O>} output A promise resolving to the final action output.
   */
  public abstract onRun(actor: Actor<I, IActorTest, O, TS>, action: I, output: Promise<O>): void;
}

export interface IActionObserverArgs<I extends IAction, O extends IActorOutput, TS = undefined> {

  /**
   * The name for this observer.
   * @default {<rdf:subject>}
   */
  name: string;

  /**
   * The bus this observer can subscribe to.
   */
  bus: Bus<Actor<I, IActorTest, O, TS>, I, IActorTest, O, TS>;
}
