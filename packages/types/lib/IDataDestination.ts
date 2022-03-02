import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

export type IDataDestination = string | RDF.Store | {
  type?: string;
  value: string | RDF.Store;
  context?: IActionContext;
};
