import type { IActionContext } from './IActionContext';
import type * as RDF from '@rdfjs/types';

export type IDataDestination = string | RDF.Store | {
  type?: string;
  value: string | RDF.Store;
  context?: IActionContext;
};
