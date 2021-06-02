import {
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput,
  IDataSource
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';

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
  quadPatternOutput: IActorRdfResolveQuadPatternOutput;
  source: IDataSource;
}

export interface IActorRdfMetadataAggregateOutput extends IActorOutput {
}
