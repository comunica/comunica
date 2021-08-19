import type { IActionAbstractMediaTyped, IActorArgsMediaTyped,
  IActorTestAbstractMediaTyped, IActorOutputAbstractMediaTypedHandle } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTyped } from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for RDF parse events.
 *
 * Actor types:
 * * Input:  IActionRdfSerialize:      A serialize input or a media type input.
 * * Test:   <none>
 * * Output: IActorRdfSerializeOutput: The serialized quads.
 *
 * @see IActionRdfSerialize
 * @see IActorRdfSerializeOutput
 */
export abstract class ActorRdfSerialize extends
  ActorAbstractMediaTyped<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput> {
  public constructor(args: IActorArgsMediaTyped<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput>) {
    super(args);
  }
}

export type IActionRootRdfSerialize = IActionAbstractMediaTyped<IActionRdfSerialize>;
export type IActorTestRootRdfSerialize = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootRdfSerialize = IActorOutputAbstractMediaTypedHandle<IActorRdfSerializeOutput>;

export interface IActionRdfSerialize extends IAction {
  /**
   * The stream of quads.
   */
  quadStream: RDF.Stream;
}

export interface IActorRdfSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain RDF serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
  /**
   * An optional field indicating if the given output stream uses a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}
