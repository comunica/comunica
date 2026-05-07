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

  /**
   * Creates a new BindingsFactory.
   * @param dataFactory The data factory used to create RDF terms.
   * @param contextMergeHandlers Optional merge handlers for bindings context entries.
   */
  public constructor(
    dataFactory: ComunicaDataFactory,
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
  ) {
    this.dataFactory = dataFactory;
    this.contextMergeHandlers = contextMergeHandlers;
  }

  /**
   * Creates a BindingsFactory by resolving merge handlers through a mediator.
   * @param mediatorMergeBindingsContext The mediator used to obtain context merge handlers.
   * @param context The action context for the mediation call.
   * @param dataFactory The data factory used to create RDF terms.
   * @return A promise that resolves to a new BindingsFactory instance.
   */
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

  /**
   * Creates a new Bindings instance from an array of variable-term pairs.
   * @param entries An array of [variable, term] tuples to include in the bindings.
   * @return A new Bindings instance containing the given entries.
   */
  public bindings(entries: [RDF.Variable, RDF.Term][] = []): Bindings {
    return new Bindings(
      this.dataFactory,
      Map(entries.map(([ key, value ]) => [ key.value, value ])),
      this.contextMergeHandlers ? { contextMergeHandlers: this.contextMergeHandlers } : undefined,
    );
  }

  /**
   * Converts an existing RDF Bindings object into a Comunica Bindings instance.
   * @param bindings The source RDF Bindings to convert.
   * @return A new Bindings instance containing the same entries.
   */
  public fromBindings(bindings: RDF.Bindings): Bindings {
    return this.bindings([ ...bindings ]);
  }

  /**
   * Creates a new Bindings from a record mapping variable names to RDF terms.
   * @param record A record whose keys are variable names and values are RDF terms.
   * @return A new Bindings instance containing the entries from the record.
   */
  public fromRecord(record: Record<string, RDF.Term>): Bindings {
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable(key), value ]));
  }
}
