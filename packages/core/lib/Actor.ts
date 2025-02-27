import type { IActionContext, Logger } from '@comunica/types';
import type { Bus } from './Bus';
import { CONTEXT_KEY_LOGGER } from './ContextEntries';
import type { TestResult } from './TestResult';

/**
 * An actor can act on messages of certain types and provide output of a certain type.
 *
 * The flow of an actor is as follows:
 * 1. Send a message to {@link Actor#test} to test if an actor can run that action.
 * 2. If the actor can reply to the message, let the actor run the action using {@link Actor#run}.
 *
 * An actor is typically subscribed to a bus,
 * using which the applicability to an action can be tested.
 *
 * @see Bus
 *
 * @template I The input type of an actor.
 * @template T The test type of an actor.
 * @template O The output type of an actor.
 * @template TS The test side data type.
 */
export abstract class Actor<I extends IAction, T extends IActorTest, O extends IActorOutput, TS = undefined>
implements IActorArgs<I, T, O, TS> {
  public readonly name: string;
  public readonly bus: Bus<Actor<I, T, O, TS>, I, T, O, TS>;
  public readonly beforeActors: Actor<I, T, O, TS>[] = [];

  /**
   * All enumerable properties from the `args` object are inherited to this actor.
   *
   * The actor will subscribe to the given bus when this constructor is called.
   *
   * @param {IActorArgs<I extends IAction, T extends IActorTest, O extends IActorOutput>} args Arguments object
   * @param {string} args.name The name for this actor.
   * @param {Bus<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>} args.bus
   *        The bus this actor subscribes to.
   * @throws When required arguments are missing.
   */
  protected constructor(args: IActorArgs<I, T, O, TS>) {
    Object.assign(this, args);
    this.bus.subscribe(this);
    if (this.beforeActors.length > 0) {
      this.bus.addDependencies(this, this.beforeActors);
    }
    if (args.busFailMessage) {
      this.bus.failMessage = args.busFailMessage;
    }
  }

  /**
   * Get the logger from the given context.
   * @param {ActionContext} context An optional context.
   * @return {Logger} The logger or undefined.
   */
  public static getContextLogger(context: IActionContext): Logger | undefined {
    return context.get(CONTEXT_KEY_LOGGER);
  }

  /**
   * Check if this actor can run the given action,
   * without actually running it.
   *
   * @param {I} action The action to test.
   * @return {Promise<T>} A promise that resolves to the test result.
   */
  public abstract test(action: I): Promise<TestResult<T, TS>>;

  /**
   * Run the given action on this actor.
   *
   * In most cases, this method should not be called directly.
   * Instead, {@link #runObservable} should be called.
   *
   * @param {I} action The action to run.
   * @return {Promise<T>} A promise that resolves to the run result.
   */
  public abstract run(action: I, sideData: TS): Promise<O>;

  /**
   * Run the given action on this actor
   * AND invokes the {@link Bus#onRun} method.
   *
   * @param {I} action The action to run.
   * @return {Promise<T>} A promise that resolves to the run result.
   */
  public runObservable(action: I, sideData: TS): Promise<O> {
    const output: Promise<O> = this.run(action, sideData);
    this.bus.onRun(this, action, output);
    return output;
  }

  /* Proxy methods for the (optional) logger that is defined in the context */

  protected getDefaultLogData(context: IActionContext, data?: (() => any)): any {
    const dataActual = data ? data() : {};
    dataActual.actor = this.name;
    return dataActual;
  }

  protected logTrace(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.trace(message, this.getDefaultLogData(context, data));
    }
  }

  protected logDebug(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.debug(message, this.getDefaultLogData(context, data));
    }
  }

  protected logInfo(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.info(message, this.getDefaultLogData(context, data));
    }
  }

  protected logWarn(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.warn(message, this.getDefaultLogData(context, data));
    }
  }

  protected logError(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.error(message, this.getDefaultLogData(context, data));
    }
  }

  protected logFatal(context: IActionContext, message: string, data?: (() => any)): void {
    const logger: Logger | undefined = Actor.getContextLogger(context);
    if (logger) {
      logger.fatal(message, this.getDefaultLogData(context, data));
    }
  }
}

export interface IActorArgs<I extends IAction, T extends IActorTest, O extends IActorOutput, TS = undefined> {
  /**
   * The name for this actor.
   * @default {<rdf:subject>}
   */
  name: string;
  /**
   * The bus this actor subscribes to.
   */
  bus: Bus<Actor<I, T, O, TS>, I, T, O, TS>;
  /**
   * The message that will be configured in the bus for reporting failures.
   *
   * This message may be a template string that contains references to the executed `action`.
   * For example, the following templated string is allowed:
   * "RDF dereferencing failed: no actors could handle ${action.handle.mediaType}"
   */
  busFailMessage?: string;
  /**
   * Actor that must be registered in the bus before this actor.
   */
  beforeActors?: Actor<I, T, O, TS>[];
}

/**
 * Data interface for the type of action.
 */
export interface IAction {
  /**
   * The input context that is passed through by actors.
   */
  context: IActionContext;
}

/**
 * Data interface for the type of an actor test result.
 */
export interface IActorTest {

}

/**
 * Data interface for the type of an actor run result.
 */
export interface IActorOutput {

}
