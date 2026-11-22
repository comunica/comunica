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
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { ICountFallback } from './QuerySourceSparql';
import { QuerySourceSparql } from './QuerySourceSparql';

/**
 * A comunica SPARQL Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaSparql extends ActorQuerySourceIdentifyHypermedia {
  public readonly mediatorHttp: MediatorHttp;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorQuerySerialize: MediatorQuerySerialize;
  public readonly checkUrlSuffix: boolean;
  public readonly forceHttpGet: boolean;
  public readonly cacheSize: number;
  public readonly forceSourceType: boolean;
  public readonly bindMethod: BindMethod;
  public readonly countTimeout: number;
  public readonly cardinalityCountQueries: boolean;
  public readonly cardinalityEstimateConstruction: boolean;
  public readonly forceGetIfUrlLengthBelow: number;
  public readonly sparqlServerSoftwarePatterns: RegExp[];
  public readonly batchAskQueries: boolean;
  public readonly countFallbackDuration: number;
  /**
   * For each endpoint of which a COUNT query failed or took too long,
   * the times until which it is not sent COUNT queries over patterns, and over other operations.
   * This is shared by all queries, as sources are identified again for each query.
   */
  protected readonly countFallbackUntil = new Map<string, { patterns: number; operations: number }>();

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
    this.batchAskQueries = args.batchAskQueries;
    this.countFallbackDuration = args.countFallbackDuration;
  }

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

  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    this.logInfo(action.context, `Identified ${action.url} as sparql source with service URL: ${action.metadata.sparqlService || action.url}`);

    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
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
      this.cardinalityCountQueries,
      this.cardinalityEstimateConstruction,
      this.forceGetIfUrlLengthBelow,
      Boolean(action.context.get(KeysInitQuery.parseUnsupportedVersions)),
      action.metadata,
      this.batchAskQueries,
      this.createCountFallback(action.url, action.context),
    );
    return { source, queriesService: true };
  }

  /**
   * Create the COUNT fallback of an endpoint, which all sources of the endpoint share.
   * @param url The URL of the endpoint.
   * @param context The context in which the endpoint is identified.
   * @return The COUNT fallback, or undefined if disabled.
   */
  public createCountFallback(url: string, context: IActionContext): ICountFallback | undefined {
    if (this.countFallbackDuration <= 0) {
      return undefined;
    }
    // A pattern that can not be counted in time means that other operations can not be either, but not vice versa.
    const isActive = (pattern: boolean): boolean => {
      const until = this.countFallbackUntil.get(url);
      return Boolean(until) && Math.max(until!.patterns, pattern ? 0 : until!.operations) > Date.now();
    };
    return {
      isActive,
      activate: (pattern: boolean) => {
        if (!isActive(pattern)) {
          this.logWarn(context, `Not sending COUNT queries over ${pattern ? 'patterns' : 'operations other than patterns'} to ${url} for ${this.countFallbackDuration} ms, as one failed or took longer than ${this.countTimeout} ms`);
        }
        const until = this.countFallbackUntil.get(url) ?? { patterns: 0, operations: 0 };
        this.countFallbackUntil.set(url, {
          ...until,
          [pattern ? 'patterns' : 'operations']: Date.now() + this.countFallbackDuration,
        });
      },
    };
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
   * If estimates for queries should be constructed locally from sub-query cardinalities,
   * which come from earlier count queries and from VoID descriptions of the endpoint.
   * If set to false, count queries will used for cardinality estimation at all levels,
   * and VoID descriptions are not used.
   * @default {true}
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
  /**
   * The time in ms during which an endpoint is not sent COUNT queries after one of them failed or took longer than
   * countTimeout, for this and later queries. Its cardinalities are then unknown, so that, e.g., sources are
   * selected with ASK queries instead and joins are ordered heuristically. COUNT results that were cached before
   * are still used. COUNT queries over a single pattern and over other operations are distinguished:
   * if one over a pattern fails, the endpoint is not sent any COUNT queries,
   * while if one over another operation fails, it is still sent COUNT queries over patterns.
   * A value of 0 or less disables this.
   * @range {integer}
   * @default {3600000}
   */
  countFallbackDuration: number;
  /**
   * If ASK queries that are issued at the same time, such as for source selection,
   * should be sent to the endpoint in a single SELECT query.
   * @default {true}
   */
  batchAskQueries: boolean;
}

export type BindMethod = 'values' | 'union' | 'filter';
