import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

export type IDataDestination = string | RDF.Store | {
  type?: string;
  value: string | RDF.Store;
  context?: IActionContext;
};
