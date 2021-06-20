import { Actor, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import {IDataSource} from "@comunica/bus-rdf-resolve-quad-pattern";

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

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    return true;
  }
}

export interface IActionRdfMetadataAggregate extends IAction {
  metadata: Record<string, any>;
  subMetadata?: Record<string, any>;
}

export interface IActorRdfMetadataAggregateOutput extends IActorOutput {
  aggregatedMetadata: Record<string, any>;
}
