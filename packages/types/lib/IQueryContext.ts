import type * as RDF from '@rdfjs/types';
import type { IDataDestination } from './IDataDestination';
import type { IProxyHandler } from './IProxyHandler';
import type { SourceType } from './IQueryEngine';
import type { QueryExplainMode } from './IQueryOperationResult';
import type { Logger } from './Logger';

/**
 * Query context when a string-based query was passed.
 */
export type QueryStringContext = RDF.QueryStringContext & RDF.QuerySourceContext<SourceType> & IQueryContextCommon;
/**
 * Query context when an algebra-based query was passed.
 */
export type QueryAlgebraContext = RDF.QueryAlgebraContext & RDF.QuerySourceContext<SourceType> & IQueryContextCommon;

export type FunctionArgumentsCache = Record<string, { func?: any; cache?: FunctionArgumentsCache }>;

/**
 * Common query context interface
 */
export interface IQueryContextCommon {
  // Types of these entries should be aligned with contextKeyShortcuts in ActorInitQueryBase
  // and Keys in @comunica/context-entries

  // Inherited from RDF.QueryStringContext: sources
  destination?: IDataDestination;
  initialBindings?: RDF.Bindings;
  // Inherited from RDF.QueryStringContext: queryFormat?: string;
  // Inherited from RDF.QueryStringContext: baseIRI?: string;
  log?: Logger;
  datetime?: Date;
  // Inherited from RDF.QueryStringContext: queryTimestamp?: Date;
  httpProxyHandler?: IProxyHandler;
  lenient?: boolean;
  httpIncludeCredentials?: boolean;
  httpAuth?: string;
  httpTimeout?: number;
  httpBodyTimeout?: boolean;
  httpRetryCount?: number;
  httpRetryDelay?: number;
  httpRetryOnServerError?: boolean;
  fetch?: typeof fetch;
  readOnly?: boolean;
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode)
  => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  functionArgumentsCache?: FunctionArgumentsCache;
  extensionFunctions?: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>;
  explain?: QueryExplainMode;
  recoverBrokenLinks?: boolean;
}
