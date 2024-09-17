import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for rdf-metadata-extract events.
 *
 * Actor types:
 * * Input:  IActionRdfMetadataExtract:      A metadata quad stream
 * * Test:   <none>
 * * Output: IActorRdfMetadataExtractOutput: A metadata hash.
 *
 * @see IActionDereferenceRdf
 * @see IActorDereferenceRdfOutput
 */
export abstract class ActorRdfMetadataExtract<TS = undefined>
  extends Actor<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Metadata extraction failed: none of the configured actors were able to extract metadata from ${action.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfMetadataExtractArgs<TS>) {
    super(args);
  }
}

export interface IActionRdfMetadataExtract extends IAction {
  /**
   * The page URL from which the quads were retrieved.
   */
  url: string;
  /**
   * The resulting quad data stream.
   */
  metadata: RDF.Stream;
  /**
   * The time it took to request the page in milliseconds.
   * This is the time until the first byte arrives.
   */
  requestTime: number;
  /**
   * The headers of the page.
   */
  headers?: Headers;
}

export interface IActorRdfMetadataExtractOutput extends IActorOutput {
  /**
   * A metadata key-value mapping.
   */
  metadata: Record<string, any>;
}

export type IActorRdfMetadataExtractArgs<TS = undefined> = IActorArgs<
IActionRdfMetadataExtract,
IActorTest,
IActorRdfMetadataExtractOutput,
TS
>;

export type MediatorRdfMetadataExtract = Mediate<IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput>;
