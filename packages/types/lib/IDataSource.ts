import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

export interface IDataSourceSerialized extends IDataSourceExpanded {
  type?: 'stringSource';
  value: string;
  mediaType: string;
  baseIRI?: string;
}

export interface IDataSourceExpanded {
  type?: string;
  value: string | RDF.Source;
  context?: IActionContext;
}

export type IDataSource = string | RDF.Source | IDataSourceExpanded | IDataSourceSerialized;

export type DataSources = IDataSource[];
