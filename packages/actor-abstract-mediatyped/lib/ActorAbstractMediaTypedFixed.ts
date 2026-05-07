import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { IActorArgsMediaTyped } from './ActorAbstractMediaTyped';
import { ActorAbstractMediaTyped } from './ActorAbstractMediaTyped';

/**
 * An abstract actor that handles media-typed actions with a fixed set of media types.
 *
 * It extends {@link ActorAbstractMediaTyped} and pre-configures the available
 * media types and their format IRIs at construction time.
 *
 * @template HI The handle action input type.
 * @template HT The handle test output type.
 * @template HO The handle action output type.
 *
 * @see ActorAbstractMediaTyped
 */
export abstract class ActorAbstractMediaTypedFixed<HI, HT, HO> extends ActorAbstractMediaTyped<HI, HT, HO> {
  public readonly mediaTypePriorities: Record<string, number>;
  public readonly mediaTypeFormats: Record<string, string>;
  public readonly priorityScale: number | undefined;

  /**
   * @param args Arguments for this actor, including fixed media type priorities and formats.
   */
  public constructor(args: IActorArgsMediaTypedFixed<HI, HT, HO>) {
    super(args);
    this.mediaTypePriorities = args.mediaTypePriorities;
    this.mediaTypeFormats = args.mediaTypeFormats;
    this.priorityScale = args.priorityScale;
    const scale: number = this.priorityScale ?? 1;
    if (this.mediaTypePriorities) {
      for (const [ _index, [ key, value ]] of Object.entries(this.mediaTypePriorities).entries()) {
        this.mediaTypePriorities[key] = scale * value;
      }
    }
    this.mediaTypePriorities = Object.freeze(this.mediaTypePriorities);
    this.mediaTypeFormats = Object.freeze(this.mediaTypeFormats);
  }

  /**
   * Tests whether this actor can handle the given action for the specified media type.
   * @param action The handle action input.
   * @param mediaType The media type to test, must be among the configured priorities.
   * @param context The action context.
   * @return A test result that fails for unrecognized media types.
   */
  public async testHandle(action: HI, mediaType: string | undefined, context: IActionContext): Promise<TestResult<HT>> {
    if (!mediaType || !(mediaType in this.mediaTypePriorities)) {
      return failTest(`Unrecognized media type: ${mediaType}`);
    }
    return await this.testHandleChecked(action, context);
  }

  /**
   * Check to see if this actor can handle the given action.
   * The media type has already been checked before this is called.
   *
   * @param {ActionContext} context An optional context.
   * @param {HI} action The action to test.
   */
  public abstract testHandleChecked(action: HI, context: IActionContext): Promise<TestResult<HT>>;

  /**
   * Tests whether this actor can report its supported media types.
   * @param _context The action context.
   * @return A passing test result.
   */
  public async testMediaType(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  /**
   * Returns the fixed set of media type priorities.
   * @param _context The action context.
   * @return The configured media type priorities.
   */
  public async getMediaTypes(_context: IActionContext): Promise<Record<string, number>> {
    return this.mediaTypePriorities;
  }

  /**
   * Tests whether this actor can report its media type format mappings.
   * @param _context The action context.
   * @return A passing test result.
   */
  public async testMediaTypeFormats(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  /**
   * Returns the fixed set of media type to format IRI mappings.
   * @param _context The action context.
   * @return The configured media type formats.
   */
  public async getMediaTypeFormats(_context: IActionContext): Promise<Record<string, string>> {
    return this.mediaTypeFormats;
  }
}

/**
 * Arguments interface for {@link ActorAbstractMediaTypedFixed}.
 *
 * @template HI The handle action input type.
 * @template HT The handle test output type.
 * @template HO The handle action output type.
 */
export interface IActorArgsMediaTypedFixed<HI, HT, HO> extends IActorArgsMediaTyped<HI, HT, HO> {
  /**
   * A record of media types, with media type name as key, and its priority as value.
   * Priorities are numbers between [0, 1].
   * @range {json}
   */
  mediaTypePriorities: Record<string, number>;
  /**
   * A record of media types, with media type name as key, and its format IRI as value.
   * @range {json}
   */
  mediaTypeFormats: Record<string, string>;
  /**
   * A multiplier for media type priorities.
   * This can be used for keeping the original media types in place,
   * but scaling all of their scores with a certain value.
   * @range {double}
   */
  priorityScale?: number;
}
