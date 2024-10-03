import type { IBindingsContextMergeHandler, MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { Bindings } from './Bindings';

/**
 * A Bindings factory that provides Bindings backed by immutable.js.
 */
export class BindingsFactory implements RDF.BindingsFactory {
  private readonly dataFactory: ComunicaDataFactory;
  private readonly contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>> | undefined;

  public constructor(
    dataFactory: ComunicaDataFactory,
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
  ) {
    this.dataFactory = dataFactory;
    this.contextMergeHandlers = contextMergeHandlers;
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
    return new Bindings(
      this.dataFactory,
      Map(entries.map(([ key, value ]) => [ key.value, value ])),
      this.contextMergeHandlers ? { contextMergeHandlers: this.contextMergeHandlers } : undefined,
    );
  }

  public fromBindings(bindings: RDF.Bindings): Bindings {
    return this.bindings([ ...bindings ]);
  }

  public fromRecord(record: Record<string, RDF.Term>): Bindings {
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable(key), value ]));
  }
}
