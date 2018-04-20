import * as Promise from 'bluebird';
import { Map } from 'immutable';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

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

// TODO: Document
export type AsyncLookUp = (expr: Alg.ExistenceExpression) => Promise<boolean>;

// tslint:disable-next-line:interface-over-type-literal
export type AsyncAggregator = {
  count(exp: Alg.Expression): Promise<number>,
  sum(exp: Alg.Expression): Promise<number>,
  min(exp: Alg.Expression): Promise<number>,
  max(exp: Alg.Expression): Promise<number>,
  avg(exp: Alg.Expression): Promise<number>,
  groupConcat(exp: Alg.Expression): Promise<string>,
  sample(exp: Alg.Expression): Promise<RDF.Term>,
};
