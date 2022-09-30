import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionInit, IActorInitArgs, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { MediatorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorQueryParse } from '@comunica/bus-query-parse';
import type { MediatorQueryResultSerializeHandle,
  MediatorQueryResultSerializeMediaTypes,
  MediatorQueryResultSerializeMediaTypeFormats } from '@comunica/bus-query-result-serialize';
import type { IActorTest } from '@comunica/core';
import type { Logger } from '@comunica/types';

/**
 * A browser-safe comunica Query Init Actor.
 */
export class ActorInitQueryBase extends ActorInit implements IActorInitQueryBaseArgs {
  public readonly mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorQueryParse: MediatorQueryParse;
  public readonly mediatorQueryResultSerialize: MediatorQueryResultSerializeHandle;
  public readonly mediatorQueryResultSerializeMediaTypeCombiner: MediatorQueryResultSerializeMediaTypes;
  public readonly mediatorQueryResultSerializeMediaTypeFormatCombiner: MediatorQueryResultSerializeMediaTypeFormats;
  public readonly mediatorContextPreprocess: MediatorContextPreprocess;
  public readonly mediatorHttpInvalidate: MediatorHttpInvalidate;

  public readonly logger: Logger;
  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly context?: string;
  public readonly contextKeyShortcuts: Record<string, string>;

  public constructor(args: IActorInitQueryBaseArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }
}

export interface IActorInitQueryBaseArgs extends IActorInitArgs {
  /**
   * The query operation optimize mediator
   */
  mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * The query parse mediator
   */
  mediatorQueryParse: MediatorQueryParse;
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
   * The context processing combinator
   */
  mediatorContextPreprocess: MediatorContextPreprocess;
  /**
   * The HTTP cache invalidation mediator
   */
  mediatorHttpInvalidate: MediatorHttpInvalidate;
  /**
   * The logger of this actor
   * @default {a <npmd:@comunica/logger-void/^2.0.0/components/LoggerVoid.jsonld#LoggerVoid>}
   */
  logger: Logger;
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
   * A JSON string of a query operation context
   */
  context?: string;
  /**
   * A record of context shortcuts to full context keys (as defined in @comunica/context-entries).
   * @range {json}
   * @default {{
   *   "source": "@comunica/bus-rdf-resolve-quad-pattern:source",
   *   "sources": "@comunica/bus-rdf-resolve-quad-pattern:sources",
   *   "destination": "@comunica/bus-rdf-update-quads:destination",
   *   "initialBindings": "@comunica/actor-init-query:initialBindings",
   *   "queryFormat": "@comunica/actor-init-query:queryFormat",
   *   "baseIRI": "@comunica/actor-init-query:baseIRI",
   *   "log": "@comunica/core:log",
   *   "datetime": "@comunica/actor-http-memento:datetime",
   *   "queryTimestamp": "@comunica/actor-init-query:queryTimestamp",
   *   "httpProxyHandler": "@comunica/actor-http-proxy:httpProxyHandler",
   *   "lenient": "@comunica/actor-init-query:lenient",
   *   "httpIncludeCredentials": "@comunica/bus-http:include-credentials",
   *   "httpAuth": "@comunica/bus-http:auth",
   *   "httpTimeout": "@comunica/bus-http:http-timeout",
   *   "httpBodyTimeout": "@comunica/bus-http:http-body-timeout",
   *   "httpRetryCount": "@comunica/bus-http:http-retry-count",
   *   "httpRetryDelay": "@comunica/bus-http:http-retry-delay",
   *   "httpRetryOnServerError": "@comunica/bus-http:http-retry-on-server-error",
   *   "fetch": "@comunica/bus-http:fetch",
   *   "recoverBrokenLinks": "@comunica/bus-http-wayback:recover-broken-links",
   *   "readOnly": "@comunica/bus-query-operation:readOnly",
   *   "extensionFunctions": "@comunica/actor-init-query:extensionFunctions",
   *   "extensionFunctionCreator": "@comunica/actor-init-query:extensionFunctionCreator",
   *   "explain": "@comunica/actor-init-query:explain",
   *   "unionDefaultGraph": "@comunica/bus-query-operation:unionDefaultGraph",
   *   "localizeBlankNodes": "@comunica/actor-query-operation:localizeBlankNodes"
   * }}
   */
  contextKeyShortcuts: Record<string, string>;
}
