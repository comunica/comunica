import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

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
  public constructor(args: IActorArgsMediaTyped<HI, HT, HO>) {
    super(args);
  }

  public async run(action: IActionAbstractMediaTyped<HI>): Promise<IActorOutputAbstractMediaTyped<HO>> {
    if ('handle' in action) {
      const typedAction: IActionAbstractMediaTypedHandle<HI> = action;
      return { handle: await this.runHandle(typedAction.handle, typedAction.handleMediaType, action.context) };
    }
    if ('mediaTypes' in action) {
      return { mediaTypes: await this.getMediaTypes(action.context) };
    }
    if ('mediaTypeFormats' in action) {
      return { mediaTypeFormats: await this.getMediaTypeFormats(action.context) };
    }
    throw new Error('Either a handle, mediaTypes or mediaTypeFormats action needs to be provided');
  }

  public async test(action: IActionAbstractMediaTyped<HI>): Promise<IActorTestAbstractMediaTyped<HT>> {
    if ('handle' in action) {
      const typedAction: IActionAbstractMediaTypedHandle<HI> = action;
      return { handle: await this.testHandle(typedAction.handle, typedAction.handleMediaType, action.context) };
    }
    if ('mediaTypes' in action) {
      return { mediaTypes: await this.testMediaType(action.context) };
    }
    if ('mediaTypeFormats' in action) {
      return { mediaTypeFormats: await this.testMediaTypeFormats(action.context) };
    }
    throw new Error('Either a handle, mediaTypes or mediaTypeFormats action needs to be provided');
  }

  /**
   * Check if this actor can run the given handle action,
   * without actually running it.
   *
   * @param {HI} action The handle action to test.
   * @param {string} mediaType The media type to test.
   * @param {ActionContext} context An optional context.
   * @return {Promise<T>} A promise that resolves to the handle test result.
   */
  public abstract testHandle(action: HI, mediaType: string | undefined, context: IActionContext): Promise<HT>;

  /**
   * Run the given handle action on this actor.
   *
   * @param {HI} action The handle action to run.
   * @param {string} mediaType The media type to run with.
   * @param {ActionContext} context An optional context.
   * @return {Promise<T>} A promise that resolves to the handle run result.
   */
  public abstract runHandle(action: HI, mediaType: string | undefined, context: IActionContext): Promise<HO>;

  /**
   * Check if this actor can emit its media types.
   *
   * @param {ActionContext} context An optional context.
   * @return {Promise<boolean>} A promise that resolves to the media type run result.
   */
  public abstract testMediaType(context: IActionContext): Promise<boolean>;

  /**
   * Get the media type of this given actor.
   *
   * @param {ActionContext} context An optional context.
   * @return {Promise<{[id: string]: number}>} A promise that resolves to the media types.
   */
  public abstract getMediaTypes(context: IActionContext): Promise<Record<string, number>>;

  /**
   * Check if this actor can emit its media type formats.
   *
   * @param {ActionContext} context An optional context.
   * @return {Promise<boolean>} A promise that resolves to the media type run result.
   */
  public abstract testMediaTypeFormats(context: IActionContext): Promise<boolean>;

  /**
   * Get the media type formats of this given actor.
   *
   * @param {ActionContext} context An optional context.
   * @return {Promise<{[id: string]: string}>} A promise that resolves to the media types.
   */
  public abstract getMediaTypeFormats(context: IActionContext): Promise<Record<string, string>>;
}

export interface IActorArgsMediaTyped<HI, HT, HO> extends IActorArgs<IActionAbstractMediaTyped<HI>,
IActorTestAbstractMediaTyped<HT>, IActorOutputAbstractMediaTyped<HO>> {}

export type IActionAbstractMediaTyped<HI> = IActionAbstractMediaTypedHandle<HI> | IActionAbstractMediaTypedMediaTypes
| IActionAbstractMediaTypedMediaTypeFormats;
export interface IActionAbstractMediaTypedHandle<HI> extends IAction {
  /**
   * The handle action input.
   */
  handle: HI;
  /**
   * The handle media type that should be used when 'handle' is truthy.
   */
  handleMediaType?: string;
}

export interface IActionAbstractMediaTypedMediaTypes extends IAction {
  /**
   * True if media types should be retrieved.
   */
  mediaTypes: boolean;
}

export interface IActionAbstractMediaTypedMediaTypeFormats extends IAction {
  /**
   * True if media type formats should be retrieved.
   */
  mediaTypeFormats: boolean;
}

/**
 * Either 'handle', or 'mediaTypes' or 'mediaTypeFormats' must be truthy.
 * Groups may not be truthy at the same time.
 */
export type IActorTestAbstractMediaTyped<HT> = IActorTestAbstractMediaTypedHandle<HT>
| IActorTestAbstractMediaTypedMediaTypes | IActorTestAbstractMediaTypedMediaTypeFormats;
export interface IActorTestAbstractMediaTypedHandle<HT> extends IActorTest {
  /**
   * The handle test output.
   */
  handle: HT;
}
export interface IActorTestAbstractMediaTypedMediaTypes extends IActorTest {
  /**
   * True if media types can be retrieved.
   */
  mediaTypes: boolean;
}
export interface IActorTestAbstractMediaTypedMediaTypeFormats extends IActorTest {
  /**
   * True if media type formats can be retrieved.
   */
  mediaTypeFormats?: boolean;
}

/**
 * Either 'handle', or 'mediaTypes' or 'mediaTypeFormats' must be truthy.
 * Groups may not be truthy at the same time.
 */
export type IActorOutputAbstractMediaTyped<HO> = IActorOutputAbstractMediaTypedHandle<HO>
| IActorOutputAbstractMediaTypedMediaTypes | IActorOutputAbstractMediaTypedMediaTypeFormats;
export interface IActorOutputAbstractMediaTypedHandle<HO> extends IActorOutput {
  /**
   * The handle action output.
   */
  handle: HO;
}
export interface IActorOutputAbstractMediaTypedMediaTypes extends IActorOutput {
  /**
   * An object containing media types as keys,
   * and preferences as values, with values ranging from 0 to 1.
   */
  mediaTypes: Record<string, number>;
}
export interface IActorOutputAbstractMediaTypedMediaTypeFormats extends IActorOutput {
  /**
   * An object containing media types as keys,
   * and format IRIs as values.
   */
  mediaTypeFormats: Record<string, string>;
}

export type MediateMediaTypes = Mediate<
IActionAbstractMediaTypedMediaTypes, IActorOutputAbstractMediaTypedMediaTypes, IActorTestAbstractMediaTypedMediaTypes>;

export type MediateMediaTyped<I extends IAction, T extends IActorTest, O extends IActorOutput> = Mediate<
IActionAbstractMediaTypedHandle<I>,
IActorOutputAbstractMediaTypedHandle<O>,
IActorTestAbstractMediaTypedHandle<T>
>;
