import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionInit, IActorInitArgs, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { MediatorQueryProcess } from '@comunica/bus-query-process';
import type {
  MediatorQueryResultSerializeHandle,
  MediatorQueryResultSerializeMediaTypes,
  MediatorQueryResultSerializeMediaTypeFormats,
} from '@comunica/bus-query-result-serialize';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * A browser-safe comunica Query Init Actor.
 */
export class ActorInitQueryBase extends ActorInit implements IActorInitQueryBaseArgs {
  public readonly mediatorQueryResultSerialize: MediatorQueryResultSerializeHandle;
  public readonly mediatorQueryResultSerializeMediaTypeCombiner: MediatorQueryResultSerializeMediaTypes;
  public readonly mediatorQueryResultSerializeMediaTypeFormatCombiner: MediatorQueryResultSerializeMediaTypeFormats;
  public readonly mediatorHttpInvalidate: MediatorHttpInvalidate;
  public readonly mediatorQueryProcess: MediatorQueryProcess;

  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly allowNoSources?: boolean;
  public readonly context?: string;

  public async test(_action: IActionInit): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(_action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }
}

export interface IActorInitQueryBaseArgs extends IActorInitArgs {
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
