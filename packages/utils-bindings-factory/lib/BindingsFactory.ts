import type { IBindingsContextMergeHandler, MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { BindingsValue, IBindingsDictionary, IContextHolder } from './Bindings';
import { Bindings } from './Bindings';
import { BindingsShape } from './BindingsShape';

/**
 * A Bindings factory that provides Bindings backed by plain arrays of values in shared shapes.
 */
export class BindingsFactory implements RDF.BindingsFactory {
  private readonly dataFactory: ComunicaDataFactory;
  private readonly contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>> | undefined;
  /**
   * Shared by all bindings without context, as context holders are never modified.
   */
  private readonly contextHolder: IContextHolder | undefined;

  public constructor(
    dataFactory: ComunicaDataFactory,
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
  ) {
    this.dataFactory = dataFactory;
    this.contextMergeHandlers = contextMergeHandlers;
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
    let shape = BindingsShape.EMPTY;
    const values = Bindings.allocateValues(entries.length);
    for (const [ key, value ] of entries) {
      const index = shape.indexOf(key.value);
      if (index === undefined) {
        values[shape.size] = value;
        shape = shape.append(key.value);
      } else {
        values[index] = value;
      }
    }
    // Only duplicate variables leave values unused.
    values.length = shape.size;
    return new Bindings(this.dataFactory, shape, this.contextHolder, values, undefined);
  }

  public fromBindings(bindings: RDF.Bindings): Bindings {
    if (bindings instanceof Bindings) {
      return new Bindings(
        this.dataFactory,
        bindings.shape,
        this.contextHolder,
        bindings.rawValues,
        bindings.dictionary,
      );
    }
    return this.bindings([ ...bindings ]);
  }

  public fromRecord(record: Record<string, RDF.Term>): Bindings {
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable(key), value ]));
  }

  /**
   * Prepare creating bindings directly from encoded quads, such as the results of an RDF store lookup,
   * so that their terms are only decoded once they are read.
   * @param dictionary The dictionary of the encodings, which must be primitive values.
   * @param variables The variables to bind.
   * @param indexes For each variable, the position of its encoding within an encoded quad.
   * @return A creator of bindings, or undefined if the variables can not be bound this way.
   */
  public createEncodedBindingsCreator(
    dictionary: IBindingsDictionary,
    variables: RDF.Variable[],
    indexes: readonly number[],
  ): EncodedBindingsCreator | undefined {
    if (variables.length !== indexes.length || variables.length > 4) {
      return undefined;
    }
    let shape = BindingsShape.EMPTY;
    for (const variable of variables) {
      if (shape.indexOf(variable.value) !== undefined) {
        return undefined;
      }
      shape = shape.append(variable.value);
    }
    return new EncodedBindingsCreator(this.dataFactory, shape, this.contextHolder, dictionary, indexes);
  }
}

/**
 * Creates bindings from encoded quads, binding a fixed set of variables to fixed positions.
 */
export class EncodedBindingsCreator {
  private readonly dataFactory: ComunicaDataFactory;
  private readonly shape: BindingsShape;
  private readonly contextHolder: IContextHolder | undefined;
  private readonly dictionary: IBindingsDictionary;
  private readonly count: number;
  private readonly i0: number;
  private readonly i1: number;
  private readonly i2: number;
  private readonly i3: number;

  public constructor(
    dataFactory: ComunicaDataFactory,
    shape: BindingsShape,
    contextHolder: IContextHolder | undefined,
    dictionary: IBindingsDictionary,
    indexes: readonly number[],
  ) {
    this.dataFactory = dataFactory;
    this.shape = shape;
    this.contextHolder = contextHolder;
    this.dictionary = dictionary;
    this.count = indexes.length;
    this.i0 = indexes[0] ?? 0;
    this.i1 = indexes[1] ?? 0;
    this.i2 = indexes[2] ?? 0;
    this.i3 = indexes[3] ?? 0;
  }

  /**
   * Create bindings from an encoded quad.
   * @param encoded The encodings of a quad, of which the configured positions are bound.
   */
  public create(encoded: readonly any[]): Bindings {
    // An array literal per size gives an array of exactly the right length and kind.
    let values: BindingsValue[];
    switch (this.count) {
      case 0:
        values = [];
        break;
      case 1:
        values = [ encoded[this.i0] ];
        break;
      case 2:
        values = [ encoded[this.i0], encoded[this.i1] ];
        break;
      case 3:
        values = [ encoded[this.i0], encoded[this.i1], encoded[this.i2] ];
        break;
      default:
        values = [ encoded[this.i0], encoded[this.i1], encoded[this.i2], encoded[this.i3] ];
    }
    return new Bindings(this.dataFactory, this.shape, this.contextHolder, values, this.dictionary);
  }
}
