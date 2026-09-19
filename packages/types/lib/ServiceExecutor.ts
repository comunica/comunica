import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';

export type ServiceExecutor = (
  serviceOperation: Algebra.Service,
  binding: RDF.Bindings | undefined,
  context: IActionContext,
) => Promise<BindingsStream | Iterable<RDF.Bindings>>;

export type ServiceExecutorCreator = (serviceNamedNode: RDF.NamedNode) => ServiceExecutor | undefined;
