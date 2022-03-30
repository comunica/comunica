import type { IActionContext, IDataDestination, IDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

export type IDatasetFactory = () => IDataSource & IDataDestination;

export interface IReasonedSource {
  type: 'full';
  reasoned: true;
  done: Promise<void>;
}

export interface IUnreasonedSource {
  type: 'full';
  reasoned: false;
}

export interface IPartialReasonedStatus {
  type: 'partial';
  // TODO: Consider using term-map here
  patterns: Map<RDF.BaseQuad, IReasonStatus>;
}

export type IReasonStatus = IReasonedSource | IUnreasonedSource;

export interface IReasonGroup {
  dataset: IDataSource & IDataDestination;
  status: IReasonStatus | IPartialReasonedStatus;
  context: IActionContext;
}
