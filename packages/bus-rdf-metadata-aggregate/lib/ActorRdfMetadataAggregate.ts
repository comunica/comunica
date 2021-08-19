import type { IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';

export abstract class ActorRdfMetadataAggregate
  extends Actor<IActionRdfMetadataAggregate, IActorTest,
  IActorRdfMetadataAggregateOutput> {
  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }
}

export interface IActionRdfMetadataAggregate extends IAction {
  metadata: Record<string, any>;
  subMetadata?: Record<string, any>;
}

export interface IActorRdfMetadataAggregateOutput extends IActorOutput {
  aggregatedMetadata: Record<string, any>;
}
