import {Map} from "immutable";
import {Bus} from "./Bus";
import {KEY_CONTEXT_LOG, Logger} from "./Logger";

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
 */
export abstract class Actor<I extends IAction, T extends IActorTest, O extends IActorOutput>
  implements IActorArgs<I, T, O> {

  public readonly name: string;
  public readonly bus: Bus<Actor<I, T, O>, I, T, O>;
  public readonly beforeActors: Actor<I, T, O>[] = [];

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
  constructor(args: IActorArgs<I, T, O>) {
    require('lodash.assign')(this, args);
    this.bus.subscribe(this);
    if (this.beforeActors.length) {
      this.bus.addDependencies(this, this.beforeActors);
    }
  }

  /**
   * Get the logger from the given context.
   * @param {ActionContext} context An optional context.
   * @return {Logger} The logger or null.
   */
  public static getContextLogger(context: ActionContext): Logger {
    return context ? context.get(KEY_CONTEXT_LOG) : null;
  }

  /**
   * Check if this actor can run the given action,
   * without actually running it.
   *
   * @param {I} action The action to test.
   * @return {Promise<T>} A promise that resolves to the test result.
   */
  public abstract async test(action: I): Promise<T>;

  /**
   * Run the given action on this actor.
   *
   * In most cases, this method should not be called directly.
   * Instead, {@link #runObservable} should be called.
   *
   * @param {I} action The action to run.
   * @return {Promise<T>} A promise that resolves to the run result.
   */
  public abstract async run(action: I): Promise<O>;

  /**
   * Run the given action on this actor
   * AND invokes the {@link Bus#onRun} method.
   *
   * @param {I} action The action to run.
   * @return {Promise<T>} A promise that resolves to the run result.
   */
  public runObservable(action: I): Promise<O> {
    const output: Promise<O> = this.run(action);
    this.bus.onRun(this, action, output);
    return output;
  }

  /**
   * Initialize this actor.
   * This should be used for doing things that take a while,
   * such as opening files.
   *
   * @return {Promise<void>} A promise that resolves when the actor has been initialized.
   */
  public async initialize(): Promise<any> {
    return true;
  }

  /**
   * Deinitialize this actor.
   * This should be used for cleaning up things when the application is shut down,
   * such as closing files and removing temporary files.
   *
   * @return {Promise<void>} A promise that resolves when the actor has been deinitialized.
   */
  public async deinitialize(): Promise<any> {
    return true;
  }

  /* Proxy methods for the (optional) logger that is defined in the context */

  protected getDefaultLogData(context: ActionContext, data?: any): any {
    if (!data) {
      data = {};
    }
    data.actor = this.name;
    return data;
  }

  protected logTrace(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.trace(message, this.getDefaultLogData(context, data));
    }
  }

  protected logDebug(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.debug(message, this.getDefaultLogData(context, data));
    }
  }

  protected logInfo(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.info(message, this.getDefaultLogData(context, data));
    }
  }

  protected logWarn(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.warn(message, this.getDefaultLogData(context, data));
    }
  }

  protected logError(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.error(message, this.getDefaultLogData(context, data));
    }
  }

  protected logFatal(context: ActionContext, message: string, data?: any): void {
    const logger: Logger = Actor.getContextLogger(context);
    if (logger) {
      logger.fatal(message, this.getDefaultLogData(context, data));
    }
  }

}

export interface IActorArgs<I extends IAction, T extends IActorTest, O extends IActorOutput> {
  name: string;
  bus: Bus<Actor<I, T, O>, I, T, O>;
  beforeActors?: Actor<I, T, O>[];
}

/**
 * An immutable key-value mapped context that can be passed to any (@link IAction}.
 * All actors that receive a context must forward this context to any actor, mediator or bus that it calls.
 * This context may be transformed before forwarding.
 *
 * Each bus should describe in its action interface which context entries are possible (non-restrictive)
 * and expose a `KEY_CONTEXT_${ENTRY_NAME}` constant for easy reuse.
 * If actors support any specific context entries next to those inherited by the bus action interface,
 * then this should be described in its README file.
 *
 * To avoid entry conflicts, all keys must be properly namespaced using the following convention:
 *   Each key must be prefixed with the package name followed by a `:`.
 *   For example, the `rdf-resolve-quad-pattern` bus declares the `sources` entry,
 *   which should be named as `@comunica/bus-rdf-resolve-quad-pattern:sources`.
 *
 * This context can contain any information that might be relevant for certain actors.
 * For instance, this context can contain a list of datasources over which operators should query.
 */
export type ActionContext = Map<string, any>;

/**
 * A convenience constructor for {@link ActionContext} based on a given hash.
 * @param {{[p: string]: any}} hash A hash that maps keys to values.
 * @return {ActionContext} The immutable action context from the hash.
 * @constructor
 */
export function ActionContext(hash: {[key: string]: any}): ActionContext {
  return Map(hash);
}

/**
 * Convert the given object to an action context object if it is not an action context object yet.
 * If it already is an action context object, return the object as-is.
 * @param maybeActionContext Any object.
 * @return {ActionContext} An action context object.
 */
export function ensureActionContext(maybeActionContext: any): ActionContext {
  return Map.isMap(maybeActionContext) ? maybeActionContext : ActionContext(maybeActionContext);
}

/**
 * Data interface for the type of action.
 */
export interface IAction {
  /**
   * The optional input context that is passed through by actors.
   */
  context?: ActionContext;
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
