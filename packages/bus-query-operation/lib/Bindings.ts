import {AsyncIterator} from "asynciterator";
import {Map} from "immutable";
import * as RDF from "rdf-js";

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
 * Variables are represented as strings containing the variable name prefixed with '?'.
 * Blank nodes are represented as strings containing the blank node name prefixed with '_:'.
 * Terms are named nodes, literals or the default graph.
 */
export type Bindings = Map<string, RDF.Term>;

/**
 * A convenience constructor for bindings based on a given hash.
 * @param {{[p: string]: RDF.Term}} hash A hash that maps variable names to terms.
 * @return {Bindings} The immutable bindings from the hash.
 * @constructor
 */
export function Bindings(hash: {[key: string]: RDF.Term}): Bindings {
  return Map(hash);
}

/**
 * Check if the given object is a bindings object.
 * @param maybeBindings Any object.
 * @return {boolean} If the object is a bindings object.
 */
export function isBindings(maybeBindings: any): boolean {
  return Map.isMap(maybeBindings);
}

/**
 * Convert the given object to a bindings object if it is not a bindings object yet.
 * If it already is a bindings object, return the object as-is.
 * @param maybeBindings Any object.
 * @return {Bindings} A bindings object.
 */
export function ensureBindings(maybeBindings: any): Bindings {
  return isBindings(maybeBindings) ? maybeBindings : Bindings(maybeBindings);
}
