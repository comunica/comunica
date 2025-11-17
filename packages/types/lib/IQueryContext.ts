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
  parseUnsupportedVersions?: boolean;
  httpIncludeCredentials?: boolean;
  httpAuth?: string;
  httpTimeout?: number;
  httpBodyTimeout?: boolean;
  httpRetryCount?: number;
  httpRetryDelayFallback?: number;
  httpRetryDelayLimit?: number;
  httpRetryStatusCodes?: number[];
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
  unionDefaultGraph?: boolean;
  traverse?: boolean;
  invalidateCache?: boolean;
  dataFactory?: ComunicaDataFactory;
  distinctConstruct?: boolean;

  sources: SourceType[];
}
