import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

/**
 * A data destination that identifies where query results or data should be written.
 */
export type IDataDestination = string | RDF.Store | {
  type?: string;
  value: string | RDF.Store;
  context?: IActionContext;
};
