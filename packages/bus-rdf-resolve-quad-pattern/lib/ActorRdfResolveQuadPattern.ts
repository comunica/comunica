import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for rdf-resolve-quad-pattern events.
 *
 * Actor types:
 * * Input:  IActionRdfResolveQuadPattern:      A quad pattern and an optional context.
 * * Test:   <none>
 * * Output: IActorRdfResolveQuadPatternOutput: The resulting quad stream and optional metadata.
 *
 * @see IActionRdfResolveQuadPattern
 * @see IActorRdfResolveQuadPatternOutput
 */
export abstract class ActorRdfResolveQuadPattern extends Actor<IActionRdfResolveQuadPattern, IActorTest,
IActorRdfResolveQuadPatternOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfResolveQuadPatternArgs) {
    super(args);
  }
}

export interface IActionRdfResolveQuadPattern extends IAction {
  /**
   * The quad pattern to resolve.
   */
  pattern: Algebra.Pattern;
}

export interface IActorRdfResolveQuadPatternOutput extends IActorOutput {
  /**
   * The resulting quad data stream.
   *
   * The returned stream MUST expose the property 'metadata'.
   * The implementor is reponsible for handling cases where 'metadata'
   * is being called without the stream being in flow-mode.
   * This metadata object MUST implement IMetadata.
   * @see IMetadata
   */
  data: AsyncIterator<RDF.Quad>;
}

export type IActorRdfResolveQuadPatternArgs = IActorArgs<
IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

export type MediatorRdfResolveQuadPattern = Mediate<IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput>;
