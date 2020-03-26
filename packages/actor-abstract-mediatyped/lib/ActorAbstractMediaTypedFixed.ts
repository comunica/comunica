import {ActionContext} from "@comunica/core";
import {ActorAbstractMediaTyped, IActorArgsMediaTyped} from "./ActorAbstractMediaTyped";

export abstract class ActorAbstractMediaTypedFixed<HI, HT, HO> extends ActorAbstractMediaTyped<HI, HT, HO> {

  /**
   * A hash of media types, with media type name as key, and its priority as value.
   * Priorities are numbers between [0, 1].
   */
  public readonly mediaTypes: {[id: string]: number};
  /**
   * A hash of media types, with media type name as key, and its format IRI as value.
   */
  public readonly mediaTypeFormats: {[id: string]: string};
  /**
   * A multiplier for media type priorities.
   * This can be used for keeping the original media types in place,
   * but scaling all of their scores with a certain value.
   */
  public readonly priorityScale: number;

  constructor(args: IActorArgsMediaTypedFixed<HI, HT, HO>) {
    super(args);
    const scale: number = this.priorityScale || this.priorityScale === 0 ? this.priorityScale : 1;
    this.mediaTypes = require('lodash.mapvalues')(this.mediaTypes, (priority: number) => priority * scale);
    this.mediaTypes = Object.freeze(this.mediaTypes);
    this.mediaTypeFormats = Object.freeze(this.mediaTypeFormats);
  }

  public async testHandle(action: HI, mediaType: string, context: ActionContext): Promise<HT> {
    if (!(mediaType in this.mediaTypes)) {
      throw new Error('Unrecognized media type: ' + mediaType);
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
  public abstract async testHandleChecked(action: HI, context: ActionContext): Promise<HT>;

  public async testMediaType(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypes(context: ActionContext): Promise<{[id: string]: number}> {
    return this.mediaTypes;
  }

  public async testMediaTypeFormats(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypeFormats(context: ActionContext): Promise<{[id: string]: string}> {
    return this.mediaTypeFormats;
  }

}

export interface IActorArgsMediaTypedFixed<HI, HT, HO> extends IActorArgsMediaTyped<HI, HT, HO> {
  mediaTypes: {[id: string]: number};
  priorityScale?: number;
}
