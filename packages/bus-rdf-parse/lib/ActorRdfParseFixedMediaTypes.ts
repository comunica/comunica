import {IAction, IActorArgs, IActorTest} from "@comunica/core";
import {
  ActorRdfParse, IActionRdfParse, IActionRdfParseOrMediaType, IActorOutputRdfParseOrMediaType,
  IActorRdfMediaTypeOutput,
} from "./ActorRdfParse";

/**
 * A base actor for listening to RDF parse events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionRdfParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputRdfParseOrMediaType: The parsed quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfParseFixedMediaTypes extends ActorRdfParse
  implements IActorRdfParseFixedMediaTypesArgs {

  /**
   * A hash of media types, with media type name as key, and its priority as value.
   * Priorities are numbers between [0, 1].
   */
  public readonly mediaTypes: {[id: string]: number};
  /**
   * A multiplier for media type priorities.
   * This can be used for keeping the original media types in place,
   * but scaling all of their scores with a certain value.
   */
  public readonly priorityScale: number;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    if (!this.mediaTypes) {
      throw new Error('A valid "mediaTypes" argument must be provided.');
    }
    const scale: number = this.priorityScale || this.priorityScale === 0 ? this.priorityScale : 1;
    this.mediaTypes = require('lodash.mapvalues')(this.mediaTypes, (priority: number) => priority * scale);
    this.mediaTypes = Object.freeze(this.mediaTypes);
  }

  public async testParse(action: IActionRdfParse): Promise<IActorTest> {
    if (!(action.mediaType in this.mediaTypes)) {
      throw new Error('Unrecognized media type: ' + action.mediaType);
    }
    return true;
  }

  public async runMediaType(action: IAction): Promise<IActorRdfMediaTypeOutput> {
    return { mediaTypes: this.mediaTypes };
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
  extends IActorArgs<IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType> {
  mediaTypes: {[id: string]: number};
  priorityScale?: number;
}
