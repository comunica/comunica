import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

/**
 * A link holder that can expose additional properties.
 */
export interface ILink {
  /**
   * The URL identifying this link.
   */
  url: string;
  /**
   * If the source type must be set to something.
   */
  forceSourceType?: string;
  /**
   * An optional stream modifier.
   * This transformation will be applied on the stream of data quads that is obtained from dereferencing the given URL.
   * @param input The stream of data quads on the given URL.
   * @returns The stream of data quads to be used for this link instead of the given stream.
   */
  transform?: (input: RDF.Stream) => Promise<RDF.Stream>;
  /**
   * Optional context to apply onto mediators when handling this link as source.
   * All entries of this context will be added (or overwritten) into the existing context.
   */
  context?: IActionContext;
  /**
   * An optional link-specific metadata object.
   * This may be used to keep track of data that is relevant to links,
   * which could be used across actors.
   */
  metadata?: Record<string, any>;
}
