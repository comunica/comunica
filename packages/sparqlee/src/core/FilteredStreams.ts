import { AsyncIterator } from 'asynciterator';
import { Map } from "immutable";
import * as RDF from "rdf-js";
import { BgpPattern, Expression } from "sparqljs";

// TODO: Make following instances
// - SyncFilter
// - AsyncFilter
// - NonLazySync/AsyncFilter (evaluation will only happen on read() call)
//      This would need to buffer input bindings and it's result
export interface IFilteredStream extends BindingsStream {

}

export type Lookup = (patter: BgpPattern) => Promise<boolean>;

export abstract class AbstractFilteredStream
  extends AsyncIterator<Bindings>
  implements IFilteredStream {

  protected readonly abstract evaluator: IEvaluator;
  protected readonly expr: Expression;

  private readonly inputs: BindingsStream;

  constructor(expr: Expression, mappings: BindingsStream, lookup: Lookup) {
    super();
    this.expr = expr;
    this.inputs = mappings;
    this.inputs.on('end', () => this.onInputEnd());
    this.inputs.on('data', (mapping: Bindings) => this.onInputData(mapping));
  }

  public abstract onInputData(mapping: Bindings): void;
  public abstract onInputEnd(): void;
}

export interface IEvaluator {
  evaluate(mapping: Bindings): boolean;
}

/**
 * A stream of bindings.
 *
 * Next to the list of available variables,
 * an optional metadata hash can be present.
 *
 * @see Bindings
 */
export type BindingsStream = AsyncIterator<Bindings>;

/**
 * An immutable solution mapping object.
 * This maps variables to a terms.
 *
 * Variables are represented as strings containing the variable name (without '?').
 * Terms are named nodes, literals or the default graph.
 */
export type Bindings = Map<string, RDF.Term>;

/**
 * A convenience constructor for bindings based on a given hash.
 * @param {{[p: string]: RDF.Term}} hash A hash that maps variable names to terms.
 * @return {Bindings} The immutable bindings from the hash.
 * @constructor
 */
export function Bindings(hash: { [key: string]: RDF.Term }): Bindings {
  return Map(hash);
}
