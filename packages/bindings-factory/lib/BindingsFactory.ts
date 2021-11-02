import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';

export class BindingsFactory {
  /**
   * A convenience constructor for bindings based on a given hash.
   * @param {{[p: string]: RDF.Term}} hash A hash that maps variable names to terms.
   * @return {Bindings} The immutable bindings from the hash.
   * @constructor
   */
  public bindings(hash: Record<string, RDF.Term>): Bindings {
    return Map(hash);
  }

  /**
   * Check if the given object is a bindings object.
   * @param maybeBindings Any object.
   * @return {boolean} If the object is a bindings object.
   */
  public isBindings(maybeBindings: any): boolean {
    return Map.isMap(maybeBindings);
  }

  /**
   * Convert the given object to a bindings object if it is not a bindings object yet.
   * If it already is a bindings object, return the object as-is.
   * @param maybeBindings Any object.
   * @return {Bindings} A bindings object.
   */
  public ensureBindings(maybeBindings: any): Bindings {
    return this.isBindings(maybeBindings) ? maybeBindings : this.bindings(maybeBindings);
  }
}
