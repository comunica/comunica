import * as RDF from '@rdfjs/types';
import { IActionContext } from '@comunica/types';

export type IDataSource = string | RDF.Source | {
  type?: string;
  value: string | RDF.Source;
  context?: IActionContext;
};
