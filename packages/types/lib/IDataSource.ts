import type * as RDF from '@rdfjs/types';
import type { IActionContext } from './IActionContext';

export type IDataSource = MaybePromise<IResolvedDataSource>;

export type IResolvedDataSource = string | RDF.Source | {
  type?: string;
  value: MaybePromise<string | RDF.Source>;
  context?: IActionContext;
};

export type DataSources = IDataSource[];

type MaybePromise<P> = P | Promise<P>;
