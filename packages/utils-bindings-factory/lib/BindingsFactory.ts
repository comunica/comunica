import type { IBindingsContextMergeHandler, MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { IContextHolder } from './Bindings';
import { Bindings } from './Bindings';

/**
 * A Bindings factory that provides Bindings backed by a native Map.
 */
export class BindingsFactory implements RDF.BindingsFactory {
  private readonly dataFactory: ComunicaDataFactory;
  /**
   * The context holder that is shared across all bindings created by this factory.
   * Context holders are never modified in-place, so sharing a single instance is safe,
   * and avoids an object allocation for every created bindings object.
   */
  private readonly contextHolder: IContextHolder | undefined;

  public constructor(
    dataFactory: ComunicaDataFactory,
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
  ) {
    this.dataFactory = dataFactory;
    this.contextHolder = contextMergeHandlers ? { contextMergeHandlers } : undefined;
  }

  public static async create(
    mediatorMergeBindingsContext: MediatorMergeBindingsContext,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): Promise<BindingsFactory> {
    return new BindingsFactory(
      dataFactory,
      (await mediatorMergeBindingsContext.mediate({ context })).mergeHandlers,
    );
  }

  public bindings(entries: [RDF.Variable, RDF.Term][] = []): Bindings {
    const entriesMap = new Map<string, RDF.Term>();
    for (const [ variable, term ] of entries) {
      entriesMap.set(variable.value, term);
    }
    return new Bindings(this.dataFactory, entriesMap, this.contextHolder);
  }

  public fromBindings(bindings: RDF.Bindings): Bindings {
    return this.bindings([ ...bindings ]);
  }

  public fromRecord(record: Record<string, RDF.Term>): Bindings {
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable(key), value ]));
  }
}
