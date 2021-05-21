import { Actor, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';

/**
 * A comunica actor for rdf-metadata-aggregate events.
 *
 * Actor types:
 * * Input:  IActionRdfMetadataAggregate:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorRdfMetadataAggregateOutput: TODO: fill in.
 *
 * @see IActionRdfMetadataAggregate
 * @see IActorRdfMetadataAggregateOutput
 */
export abstract class ActorRdfMetadataAggregate extends Actor<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput> {
  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }
}

export interface IActionRdfMetadataAggregate extends IAction {

}

export interface IActorRdfMetadataAggregateOutput extends IActorOutput {

}
