import type * as RDF from '@rdfjs/types';
import type { ComunicaDataFactory } from './ComunicaDataFactory';
import type { FunctionArgumentsCache } from './ExpressionEvaluator';
import type { IDataDestination } from './IDataDestination';
import type { IProxyHandler } from './IProxyHandler';
import type { SourceType } from './IQueryEngine';
import type { QueryExplainMode } from './IQueryOperationResult';
import type { Logger } from './Logger';

// We omit `& RDF.QuerySourceContext<SourceType>` in the following two types
// as the QuerySourceContext proved to be too developer-unfriendly.

/**
 * Query context when a string-based query was passed.
 */
export type QueryStringContext = RDF.QueryStringContext & IQueryContextCommon;
/**
 * Query context when an algebra-based query was passed.
 */
export type QueryAlgebraContext = RDF.QueryAlgebraContext & IQueryContextCommon;

/**
 * The possible decisions for a single named graph that a FROM NAMED source's own dereferenced data
 * already exposes under its own name:
 * - error: refuse to load the source.
 * - mergeNamedInSourceGraph: rewrite this graph's quads into the FROM NAMED graph too, discarding it.
 * - keepSourceGraphs: leave this graph exactly as-is, so the source ends up exposing it alongside the
 *   FROM NAMED graph.
 */
export type DereferenceFromNamedConflictMode = 'error' | 'mergeNamedInSourceGraph' | 'keepSourceGraphs';

/**
 * Resolves, per named graph a FROM NAMED source already has of its own, whether to error (default),
 * merge it into the FROM NAMED graph, or keep it as-is.
 */
export type DereferenceFromNamedConflictModeResolver = (name: RDF.Term) => DereferenceFromNamedConflictMode;

/**
 * Common query context interface
 */
export interface IQueryContextCommon {
  // Types of these entries should be aligned with contextKeyShortcuts in ActorContextPreprocessConvertShortcuts,
  // Keys in @comunica/context-entries, and possibly the CliArgsHandlers in @comunica/actor-init-query.

  // Inherited from RDF.QueryStringContext: sources
  destination?: IDataDestination;
  initialBindings?: RDF.Bindings;
  // Inherited from RDF.QueryStringContext: queryFormat?: string;
  // Inherited from RDF.QueryStringContext: baseIRI?: string;
  fileBaseIRI?: string;
  log?: Logger;
  datetime?: Date;
  // Inherited from RDF.QueryStringContext: queryTimestamp?: Date;
  queryTimestampHighResolution?: DOMHighResTimeStamp;
  httpProxyHandler?: IProxyHandler;
  lenient?: boolean;
  serviceAllowFileTargets?: boolean;
  serviceAllowVariableTargets?: boolean;
  parseUnsupportedVersions?: boolean;
  httpIncludeCredentials?: boolean;
  httpAuth?: string;
  httpTimeout?: number;
  httpBodyTimeout?: boolean;
  httpRetryCount?: number;
  httpRetryDelayFallback?: number;
  httpRetryDelayLimit?: number;
  httpRetryStatusCodes?: number[];
  httpRetryBodyCount?: number;
  httpRetryBodyDelayFallback?: number;
  httpRetryBodyAllowUnsafe?: boolean;
  httpRetryBodyMaxBytes?: number;
  httpAbortSignal?: AbortSignal;
  httpCache?: boolean;
  fetch?: typeof fetch;
  recoverBrokenLinks?: boolean;
  readOnly?: boolean;
  extensionFunctions?: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>;
  extensionFunctionsAlwaysPushdown?: boolean;
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode)
  => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  functionArgumentsCache?: FunctionArgumentsCache;
  explain?: QueryExplainMode;
  nonLexicalComparison?: boolean;
  fullTermComparison?: boolean;
  unionDefaultGraph?: boolean;
  traverse?: boolean;
  invalidateCache?: boolean;
  dataFactory?: ComunicaDataFactory;
  distinctConstruct?: boolean;
  rdfSerializationPrefixes?: Record<string, string>;
  dereferenceFromNamed?: boolean;
  dereferenceFromNamedConflictMode?: DereferenceFromNamedConflictModeResolver;

  sources: SourceType[];
}
