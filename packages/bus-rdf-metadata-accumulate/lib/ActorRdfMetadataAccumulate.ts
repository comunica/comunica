import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { MetadataBindings } from '@comunica/types';

/**
 * A comunica actor for rdf-metadata-accumulate events.
 *
 * Actor types:
 * * Input:  IActionRdfMetadataAccumulate:      The metadata objects to accumulate,
 *                                              or a trigger for initializing a new value.
 * * Test:   <none>
 * * Output: IActorRdfMetadataAccumulateOutput: The accumulated metadata object.
 *
 * @see IActionRdfMetadataAccumulate
 * @see IActorRdfMetadataAccumulateOutput
 */
export abstract class ActorRdfMetadataAccumulate<TS = undefined>
  extends Actor<IActionRdfMetadataAccumulate, IActorTest, IActorRdfMetadataAccumulateOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Metadata accumulation failed: none of the configured actors were able to accumulate metadata in mode ${action.mode}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfMetadataAccumulateArgs<TS>) {
    super(args);
  }
}

export type IActionRdfMetadataAccumulate = IActionRdfMetadataAccumulateInitialize | IActionRdfMetadataAccumulateAppend;

export interface IActionRdfMetadataAccumulateInitialize extends IAction {
  /**
   * Indicates that metadata fields should be initialized to default values.
   */
  mode: 'initialize';
}

export interface IActionRdfMetadataAccumulateAppend extends IAction {
  /**
   * Indicates that metadata fields should be accumulated.
   * The initialize step is guaranteed to have been called before this on the `accumulatedMetadata` object.
   */
  mode: 'append';
  /**
   * The metadata object that already has some accumulated fields.
   * This object should not be mutated.
   */
  accumulatedMetadata: MetadataBindings;
  /**
   * The metadata object with fields to append.
   * This object should not be mutated.
   */
  appendingMetadata: MetadataBindings;
}

export interface IActorRdfMetadataAccumulateOutput extends IActorOutput {
  /**
   * The initialized or accumulated metadata object.
   * This should only contain those fields that are applicable to this actor.
   */
  metadata: Partial<MetadataBindings>;
}

export type IActorRdfMetadataAccumulateArgs<TS = undefined> = IActorArgs<
IActionRdfMetadataAccumulate,
IActorTest,
IActorRdfMetadataAccumulateOutput,
TS
>;

export type MediatorRdfMetadataAccumulate = Mediate<
IActionRdfMetadataAccumulate,
IActorRdfMetadataAccumulateOutput
>;
