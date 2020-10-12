import type { IActorArgs, IActorTest } from '@comunica/core';
import type { IActionRdfDereference, IActorRdfDereferenceOutput } from './ActorRdfDereference';
import { ActorRdfDereference } from './ActorRdfDereference';

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
  public readonly mediaMappings: Record<string, string>;

  public constructor(args: IActorRdfDereferenceMediaMappingsArgs) {
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
      const ext = path.slice(dotIndex);
      // Ignore dot
      return this.mediaMappings[ext.slice(1)] || '';
    }
    return '';
  }
}

export interface IActorRdfDereferenceMediaMappingsArgs
  extends IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {
  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   */
  mediaMappings: Record<string, string>;
}
