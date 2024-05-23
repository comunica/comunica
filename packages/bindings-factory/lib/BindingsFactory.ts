import type { IBindingsContextMergeHandler, MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import { Bindings } from './Bindings';

/**
 * A Bindings factory that provides Bindings backed by immutable.js.
 */
export class BindingsFactory implements RDF.BindingsFactory {
  private readonly dataFactory: RDF.DataFactory;
  private readonly contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>> | undefined;

  public constructor(
    dataFactory: DataFactory = new DataFactory(),
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
  ) {
    this.dataFactory = dataFactory;
    this.contextMergeHandlers = contextMergeHandlers;
  }

  public static async create(
    mediatorMergeBindingsContext: MediatorMergeBindingsContext,
    context: IActionContext,
  ): Promise<BindingsFactory> {
    return new BindingsFactory(
      new DataFactory(),
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
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable!(key), value ]));
  }
}
