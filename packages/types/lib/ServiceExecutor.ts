import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { IQueryBindingsOptions } from './IQuerySource';

export type AsyncServiceExecutor = (
  serviceOperation: Algebra.Service,
  binding: RDF.Bindings | undefined,
  context: IActionContext,
  options?: IQueryBindingsOptions,
) => BindingsStream | Promise<BindingsStream>;

export type AsyncServiceExecutorCreator = (serviceNamedNode: RDF.NamedNode) =>
Promise<AsyncServiceExecutor | undefined> | AsyncServiceExecutor | undefined;
