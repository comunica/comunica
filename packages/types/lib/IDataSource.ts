import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

export interface ISerializeDataSource {
  type?: string;
  value: string | RDF.Source;
  context?: IActionContext;
  mediaType?: string;
  baseIri?: string;
}

export type IDataSource = string | RDF.Source | {
  type?: string;
  value: string | RDF.Source;
  context?: IActionContext;
  mediaType?: string;
  baseIri?: string;
};

export type DataSources = IDataSource[];
