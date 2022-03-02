import type {
  IActionDereferenceParse,
  IActorDereferenceParseArgs,
  IActorDereferenceParseOutput,
} from '@comunica/bus-dereference';
import {
  ActorDereferenceParse,
} from '@comunica/bus-dereference';
import type { IActionRdfParseMetadata, IActorRdfParseOutputMetadata } from '@comunica/bus-rdf-parse';
import type { Mediate } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A base actor for dereferencing URLs to quad streams.
 *
 * Actor types:
 * * Input:  IActionDereferenceRdf:      A URL.
 * * Test:   <none>
 * * Output: IActorDereferenceRdfOutput: A quad stream.
 *
 * @see IActionDereferenceRdf
 * @see IActorDereferenceRdfOutput
 */
export abstract class ActorDereferenceRdf extends
  ActorDereferenceParse<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorDereferenceRdfArgs) {
    super(args);
  }
}

export interface IActorDereferenceRdfArgs extends
  IActorDereferenceParseArgs<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
}

export type IActionDereferenceRdf = IActionDereferenceParse<IActionRdfParseMetadata>;

export type IActorDereferenceRdfOutput = IActorDereferenceParseOutput<RDF.Stream, IActorRdfParseOutputMetadata>;

export type MediatorDereferenceRdf = Mediate<IActionDereferenceRdf, IActorDereferenceRdfOutput>;
