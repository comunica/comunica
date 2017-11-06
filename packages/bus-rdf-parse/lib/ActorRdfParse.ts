import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A base actor for listening to RDF parse events.
 *
 * Actor types:
 * * Input:  IActionRdfParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputRdfParseOrMediaType: The parsed quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfParse extends
  Actor<IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType> {

  constructor(args: IActorArgs<IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType>) {
    super(args);
  }

  public async run(action: IActionRdfParseOrMediaType): Promise<IActorOutputRdfParseOrMediaType> {
    if (action.parse) {
      const parse: IActorRdfParseOutput = await this.runParse(action.parse);
      return { parse };
    } else if (action.mediaType) {
      const mediaType: IActorRdfMediaTypeOutput = await this.runMediaType(action.mediaType);
      return { mediaType };
    } else {
      throw new Error('Either a parse or mediaType action needs to be provided');
    }
  }

  public async test(action: IActionRdfParseOrMediaType): Promise<IActorTest> {
    if (action.parse) {
      return this.testParse(action.parse);
    } else if (action.mediaType) {
      return true;
    } else {
      throw new Error('Either a parse or mediaType action needs to be provided');
    }
  }

  /**
   * Check if this actor can run the given parse action,
   * without actually running it.
   *
   * @param {I} action The parse action to test.
   * @return {Promise<T>} A promise that resolves to the parse test result.
   */
  public abstract async testParse(action: IActionRdfParse): Promise<IActorTest>;

  /**
   * Run the given parse action on this actor.
   *
   * @param {I} action The parse action to run.
   * @return {Promise<T>} A promise that resolves to the parse run result.
   */
  public abstract runParse(action: IActionRdfParse): Promise<IActorRdfParseOutput>;

  /**
   * Run the given media type action on this actor.
   *
   * @param {I} action The media type action to run.
   * @return {Promise<T>} A promise that resolves to the media type run result.
   */
  public abstract runMediaType(action: IAction): Promise<IActorRdfMediaTypeOutput>;

}

/**
 * A composite action containing a parse of media type action.
 * One of the fields MUST be truthy.
 */
export interface IActionRdfParseOrMediaType extends IAction {
  parse?: IActionRdfParse;
  mediaType?: boolean;
}

/**
 * The RDF parse input, which contains the input stream in the given media type.
 * One of the fields MUST be truthy.
 */
export interface IActionRdfParse extends IAction {
  /**
   * A readable string stream in a certain RDF serialization that needs to be parsed.
   */
  input: Readable;
  /**
   * Media type that identifies the RDF serialization of the given input.
   */
  mediaType: string;
}

/**
 * A composite action output containing a parse of media type action result.
 */
export interface IActorOutputRdfParseOrMediaType extends IActorOutput {
  parse?: IActorRdfParseOutput;
  mediaType?: IActorRdfMediaTypeOutput;
}

export interface IActorRdfParseOutput extends IActorOutput {
  /**
   * The resulting quad stream.
   */
  quads: RDF.Stream;
}

/**
 * The RDF media type output.
 */
export interface IActorRdfMediaTypeOutput extends IActorOutput {
  /**
   * An object containing media types as keys (identifying an RDF serialization),
   * and preferences as values, with values ranging from 0 to 1.
   */
  mediaTypes: {[id: string]: number};
}
