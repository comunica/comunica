import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";

/**
 * An abstract actor that handles media-typed actions.
 *
 * It splits up a action between a 'handle' and a 'mediaTypes' action.
 * A 'mediaTypes' action is used to retrieve the available media types from this actor.
 * A 'handle' action is abstract, and can be implemented to do anything,
 * such as parsing, serializing, etc.
 * @see IActionAbstractMediaTyped
 *
 * @see ActorAbstractMediaTypedFixed
 */
export abstract class ActorAbstractMediaTyped<HI, HT, HO>
  extends Actor<IActionAbstractMediaTyped<HI>, IActorTestAbstractMediaTyped<HT>, IActorOutputAbstractMediaTyped<HO>> {

  constructor(args: IActorArgsMediaTyped<HI, HT, HO>) {
    super(args);
  }

  public async run(action: IActionAbstractMediaTyped<HI>): Promise<IActorOutputAbstractMediaTyped<HO>> {
    if (action.handle) {
      return { handle: await this.runHandle(action.handle, action.handleMediaType) };
    } else if (action.mediaTypes) {
      return { mediaTypes: await this.getMediaTypes() };
    } else {
      throw new Error('Either a handle or mediaType action needs to be provided');
    }
  }

  public async test(action: IActionAbstractMediaTyped<HI>): Promise<IActorTestAbstractMediaTyped<HT>> {
    if (action.handle) {
      return { handle: await this.testHandle(action.handle, action.handleMediaType) };
    } else if (action.mediaTypes) {
      return { mediaTypes: await this.testMediaType() };
    } else {
      throw new Error('Either a handle or mediaType action needs to be provided');
    }
  }

  /**
   * Check if this actor can run the given handle action,
   * without actually running it.
   *
   * @param {HI} action The handle action to test.
   * @param {string} mediaType The media type to test.
   * @return {Promise<T>} A promise that resolves to the handle test result.
   */
  public abstract async testHandle(action: HI, mediaType: string): Promise<HT>;

  /**
   * Run the given handle action on this actor.
   *
   * @param {HI} action The handle action to run.
   * @param {string} mediaType The media type to run with.
   * @return {Promise<T>} A promise that resolves to the handle run result.
   */
  public abstract runHandle(action: HI, mediaType: string): Promise<HO>;

  /**
   * Check if this actor can emit its media types.
   *
   * @return {Promise<boolean>} A promise that resolves to the media type run result.
   */
  public abstract testMediaType(): Promise<boolean>;

  /**
   * Get the media type of this given actor.
   *
   * @return {Promise<{[id: string]: number}>} A promise that resolves to the media types.
   */
  public abstract getMediaTypes(): Promise<{[id: string]: number}>;

}

export interface IActorArgsMediaTyped<HI, HT, HO> extends IActorArgs<IActionAbstractMediaTyped<HI>,
  IActorTestAbstractMediaTyped<HT>, IActorOutputAbstractMediaTyped<HO>> {}

/**
 * Either 'handle' and 'handleMediaType' must be truthy, or 'mediaTypes' must be truthy.
 * Both groups may not be truthy at the same time.
 */
export interface IActionAbstractMediaTyped<HI> extends IAction {
  /**
   * The handle action input.
   */
  handle?: HI;
  /**
   * The handle media type that should be used when 'handle' is truthy.
   */
  handleMediaType?: string;
  /**
   * True if media types should be retrieved.
   */
  mediaTypes?: boolean;
}

/**
 * Either 'handle' must be truthy, or 'mediaTypes' must be truthy.
 * Both groups may not be truthy at the same time.
 */
export interface IActorTestAbstractMediaTyped<HT> extends IActorTest {
  /**
   * The handle test output.
   */
  handle?: HT;
  /**
   * True if media types can be retrieved.
   */
  mediaTypes?: boolean;
}

/**
 * Either 'handle' must be truthy, or 'mediaTypes' must be truthy.
 * Both groups may not be truthy at the same time.
 */
export interface IActorOutputAbstractMediaTyped<HO> extends IActorOutput {
  /**
   * The handle action output.
   */
  handle?: HO;
  /**
   * An object containing media types as keys,
   * and preferences as values, with values ranging from 0 to 1.
   */
  mediaTypes?: {[id: string]: number};
}
