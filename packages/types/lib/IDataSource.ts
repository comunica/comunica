import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

export type IDataSource = MaybePromise<IResolvedDataSource>;

export type IResolvedDataSource = string | RDF.Source | {
  type?: string;
  value: MaybePromise<string | RDF.Source>;
  context?: IActionContext;
};

export type DataSources = IDataSource[];

type MaybePromise<P> = P | Promise<P>;
