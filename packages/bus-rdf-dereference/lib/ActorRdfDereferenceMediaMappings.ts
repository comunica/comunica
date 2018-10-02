import {IActorArgs, IActorTest} from "@comunica/core";
import {ActorRdfDereference, IActionRdfDereference, IActorRdfDereferenceOutput} from "./ActorRdfDereference";

/**
 * A base actor for dereferencing URLs to quad streams.
 *
 * Actor types:
 * * Input:  IActionRdfDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorRdfDereferenceOutput: A quad stream.
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfDereferenceMediaMappings extends ActorRdfDereference {

  public readonly mediaMappings: { [id: string]: string };

  constructor(args: IActorRdfDereferenceMediaMappingsArgs) {
    super(args);
  }

  /**
   * Get the media type based on the extension of the given path,
   * which can be an URL or file path.
   * @param {string} path A path.
   * @return {string} A media type or the empty string.
   */
  public getMediaTypeFromExtension(path: string): string {
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex >= 0) {
      const ext = path.substr(dotIndex);
      // ignore dot
      return this.mediaMappings[ext.substring(1)] || '';
    }
    return '';
  }

}

export interface IActorRdfDereferenceMediaMappingsArgs
  extends IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {
  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   */
  mediaMappings: { [id: string]: string };
}
