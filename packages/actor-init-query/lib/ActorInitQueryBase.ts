import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionInit, IActorInitArgs, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { MediatorQueryProcess } from '@comunica/bus-query-process';
import type { MediatorQueryResultSerializeHandle,
  MediatorQueryResultSerializeMediaTypes,
  MediatorQueryResultSerializeMediaTypeFormats } from '@comunica/bus-query-result-serialize';
import type { IActorTest } from '@comunica/core';
import type { IQueryContextCommon } from '@comunica/types';

/**
 * A browser-safe comunica Query Init Actor.
 */
export class ActorInitQueryBase<QueryContext extends IQueryContextCommon = IQueryContextCommon>
  extends ActorInit implements IActorInitQueryBaseArgs<QueryContext> {
  public readonly mediatorQueryResultSerialize: MediatorQueryResultSerializeHandle;
  public readonly mediatorQueryResultSerializeMediaTypeCombiner: MediatorQueryResultSerializeMediaTypes;
  public readonly mediatorQueryResultSerializeMediaTypeFormatCombiner: MediatorQueryResultSerializeMediaTypeFormats;
  public readonly mediatorHttpInvalidate: MediatorHttpInvalidate;
  public readonly mediatorQueryProcess: MediatorQueryProcess;

  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly allowNoSources?: boolean;
  public readonly context?: string;

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }
}

export interface IActorInitQueryBaseArgs<QueryContext extends IQueryContextCommon = IQueryContextCommon>
  extends IActorInitArgs {
  /**
   * The query process mediator
   */
  mediatorQueryProcess: MediatorQueryProcess;
  /**
   * The query serialize mediator
   */
  mediatorQueryResultSerialize: MediatorQueryResultSerializeHandle;
  /**
   * The query serialize media type combinator
   */
  mediatorQueryResultSerializeMediaTypeCombiner: MediatorQueryResultSerializeMediaTypes;
  /**
   * The query serialize media type format combinator
   */
  mediatorQueryResultSerializeMediaTypeFormatCombiner: MediatorQueryResultSerializeMediaTypeFormats;
  /**
   * The HTTP cache invalidation mediator
   */
  mediatorHttpInvalidate: MediatorHttpInvalidate;

  /**
   * A SPARQL query string
   */
  queryString?: string;
  /**
   * The default query input format
   * @default {sparql}
   */
  defaultQueryInputFormat?: string;
  /**
   * If it should be allowed that the user passes no sources.
   * @default {false}
   */
  allowNoSources?: boolean;
  /**
   * A JSON string of a query operation context
   */
  context?: string;
}
