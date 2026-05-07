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
  /** The mediator for serializing query results. */
  public readonly mediatorQueryResultSerialize: MediatorQueryResultSerializeHandle;
  /** The mediator for combining available result serialization media types. */
  public readonly mediatorQueryResultSerializeMediaTypeCombiner: MediatorQueryResultSerializeMediaTypes;
  /** The mediator for combining available result serialization media type formats. */
  public readonly mediatorQueryResultSerializeMediaTypeFormatCombiner: MediatorQueryResultSerializeMediaTypeFormats;
  /** The mediator for invalidating HTTP caches. */
  public readonly mediatorHttpInvalidate: MediatorHttpInvalidate;
  /** The mediator for processing queries. */
  public readonly mediatorQueryProcess: MediatorQueryProcess;

  /** An optional default SPARQL query string. */
  public readonly queryString?: string;
  /** The default query input format. */
  public readonly defaultQueryInputFormat?: string;
  /** Whether it is allowed to pass no sources. */
  public readonly allowNoSources?: boolean;
  /** An optional JSON string representing a query context. */
  public readonly context?: string;

  /**
   * Creates a new query initialization actor.
   * @param args The actor configuration arguments.
   */
  public constructor(args: IActorInitQueryBaseArgs) {
    super(args);
    this.mediatorQueryResultSerialize = args.mediatorQueryResultSerialize;
    this.mediatorQueryResultSerializeMediaTypeCombiner = args.mediatorQueryResultSerializeMediaTypeCombiner;
    this.mediatorQueryResultSerializeMediaTypeFormatCombiner = args.mediatorQueryResultSerializeMediaTypeFormatCombiner;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
    this.mediatorQueryProcess = args.mediatorQueryProcess;
    this.queryString = args.queryString;
    this.defaultQueryInputFormat = args.defaultQueryInputFormat;
    this.allowNoSources = args.allowNoSources;
    this.context = args.context;
  }

  /**
   * Tests whether this actor can handle the given initialization action.
   * @param _action The initialization action to test.
   * @return A promise resolving to a passing test result.
   */
  public async test(_action: IActionInit): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * Runs the initialization action. Not supported in browser environments.
   * @param _action The initialization action to run.
   * @return A promise that always rejects with an error in browser environments.
   */
  public async run(_action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }
}

/**
 * Arguments interface for {@link ActorInitQueryBase}.
 */
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
