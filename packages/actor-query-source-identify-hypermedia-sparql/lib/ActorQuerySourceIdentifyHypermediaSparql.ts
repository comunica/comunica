import type { MediatorHttp } from '@comunica/bus-http';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQuerySerialize } from '@comunica/bus-query-serialize';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import {
  ActorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { QuerySourceSparql } from './QuerySourceSparql';

/**
 * A comunica SPARQL Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaSparql extends ActorQuerySourceIdentifyHypermedia {
  /**
   * The mediator for HTTP requests.
   */
  public readonly mediatorHttp: MediatorHttp;
  /**
   * The mediator for creating binding context merge handlers.
   */
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * The mediator for serializing SPARQL queries.
   */
  public readonly mediatorQuerySerialize: MediatorQuerySerialize;
  /**
   * Whether URLs ending with '/sparql' should be considered SPARQL endpoints.
   */
  public readonly checkUrlSuffix: boolean;
  /**
   * Whether non-update queries should be sent via HTTP GET.
   */
  public readonly forceHttpGet: boolean;
  /**
   * The maximum number of entries in the COUNT query cache.
   */
  public readonly cacheSize: number;
  /**
   * Whether the source type is forced regardless of metadata detection.
   */
  public readonly forceSourceType: boolean;
  /**
   * The method used to communicate bindings to the endpoint.
   */
  public readonly bindMethod: BindMethod;
  /**
   * The timeout in milliseconds for COUNT queries.
   */
  public readonly countTimeout: number;
  /**
   * Whether COUNT queries should be sent for cardinality estimation.
   */
  public readonly cardinalityCountQueries: boolean;
  /**
   * Whether local cardinality estimation is attempted before COUNT queries.
   */
  public readonly cardinalityEstimateConstruction: boolean;
  /**
   * Force GET when the URL length (including query) is below this threshold.
   */
  public readonly forceGetIfUrlLengthBelow: number;
  /**
   * Regular expression patterns to match against the server header for endpoint detection.
   */
  public readonly sparqlServerSoftwarePatterns: RegExp[];

  /**
   * Creates a new SPARQL query source identify hypermedia actor.
   * @param args The actor arguments.
   */
  public constructor(args: IActorQuerySourceIdentifyHypermediaSparqlArgs) {
    super(args, 'sparql');
    this.mediatorHttp = args.mediatorHttp;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.mediatorQuerySerialize = args.mediatorQuerySerialize;
    this.checkUrlSuffix = args.checkUrlSuffix;
    this.forceHttpGet = args.forceHttpGet;
    this.cacheSize = args.cacheSize;
    this.forceSourceType = Boolean(args.forceSourceType);
    this.bindMethod = args.bindMethod;
    this.countTimeout = args.countTimeout;
    this.cardinalityCountQueries = args.cardinalityCountQueries;
    this.cardinalityEstimateConstruction = args.cardinalityEstimateConstruction;
    this.forceGetIfUrlLengthBelow = args.forceGetIfUrlLengthBelow;
    this.sparqlServerSoftwarePatterns = (
      args.sparqlServerSoftwarePatterns ?? []
    ).map(pattern => new RegExp(pattern, 'u'));
  }

  /**
   * Checks whether the server software string matches any configured SPARQL server pattern.
   * @param serverSoftware The server software header value.
   * @return Whether the server software matches a known pattern.
   */
  public checkServerSoftware(serverSoftware?: string): boolean {
    if (!serverSoftware) {
      return false;
    }
    for (const regex of this.sparqlServerSoftwarePatterns) {
      if (regex.test(serverSoftware)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Tests whether the action metadata indicates a SPARQL endpoint.
   * @param action The hypermedia identification action.
   * @return A test result with filter factor or failure.
   */
  public async testMetadata(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    if (!action.forceSourceType && !this.forceSourceType && !action.metadata.sparqlService &&
      !(this.checkUrlSuffix && (action.url.endsWith('/sparql') || action.url.endsWith('/sparql/'))) &&
        !this.checkServerSoftware(action.metadata.serverSoftware)) {
      return failTest(`Actor ${this.name} could not detect a SPARQL service description or URL ending on /sparql.`);
    }
    return passTest({ filterFactor: 1 });
  }

  /**
   * Creates a QuerySourceSparql for the identified SPARQL endpoint.
   * @param action The hypermedia identification action.
   * @return The identified query source output.
   */
  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    this.logInfo(action.context, `Identified ${action.url} as sparql source with service URL: ${action.metadata.sparqlService || action.url}`);

    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const isSingularSource = action.context.get(KeysQueryOperation.querySources)?.length === 1;
    const source = new QuerySourceSparql(
      (action.forceSourceType ?? this.forceSourceType) ? action.url : action.metadata.sparqlService || action.url,
      // Pass the original URL as backup, as some endpoints misconfigure their endpoint URL in the service description.
      action.url,
      action.context,
      this.mediatorHttp,
      this.mediatorQuerySerialize,
      this.bindMethod,
      dataFactory,
      algebraFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
      this.forceHttpGet,
      this.cacheSize,
      this.countTimeout,
      // Cardinalities can be infinity when we're querying just a single source.
      this.cardinalityCountQueries && !isSingularSource,
      this.cardinalityEstimateConstruction,
      this.forceGetIfUrlLengthBelow,
      Boolean(action.context.get(KeysInitQuery.parseUnsupportedVersions)),
      action.metadata,
    );
    return { source };
  }
}

export interface IActorQuerySourceIdentifyHypermediaSparqlArgs extends IActorQuerySourceIdentifyHypermediaArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * Mediator for serializing queries.
   */
  mediatorQuerySerialize: MediatorQuerySerialize;
  /**
   * If URLs ending with '/sparql' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffix: boolean;
  /**
   * If non-update queries should be sent via HTTP GET instead of POST
   * @default {false}
   */
  forceHttpGet: boolean;
  /**
   * The cache size for COUNT queries.
   * @range {integer}
   * @default {1024}
   */
  cacheSize: number;
  /**
   * If provided, forces the source type of a source.
   * @default {false}
   */
  forceSourceType?: boolean;
  /**
   * The query operation for communicating bindings.
   * @default {values}
   */
  bindMethod: BindMethod;
  /**
   * Timeout in ms of how long count queries are allowed to take.
   * If the timeout is reached, an infinity cardinality is returned.
   * @default {3000}
   */
  countTimeout: number;
  /**
   * If count queries should be sent to obtain the cardinality of (sub)queries.
   * If set to false, resulting cardinalities will always be considered infinity.
   * @default {true}
   */
  cardinalityCountQueries: boolean;
  /**
   * If estimates for queries should be constructed locally from sub-query cardinalities.
   * If set to false, count queries will used for cardinality estimation at all levels.
   * @default {false}
   */
  cardinalityEstimateConstruction: boolean;
  /**
   * Force an HTTP GET instead of default POST (when forceHttpGet is false)
   * when the url length (including encoded query) is below this number.
   * @default {600}
   */
  forceGetIfUrlLengthBelow: number;
  /**
   * Regexes to match against the server header to identify SPARQL endpoints.
   */
  sparqlServerSoftwarePatterns?: string[];
}

/**
 * The method used to communicate bindings to a SPARQL endpoint.
 */
export type BindMethod = 'values' | 'union' | 'filter';
