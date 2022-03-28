import type { IActionContext } from './IActionContext';
import type * as RDF from '@rdfjs/types';

export type IDataSource = string | RDF.Source | {
  type?: string;
  value: string | RDF.Source;
  context?: IActionContext;
};

export type DataSources = IDataSource[];
