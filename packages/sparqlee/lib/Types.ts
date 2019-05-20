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

export interface ExpressionEvaluator<ExpressionType, TermType> {
  evaluate(expr: ExpressionType, mapping: Bindings): TermType;
}

// export type Hooks = {
//   existence?: ExistenceHook;
//   aggregate?: AggregateHook;
//   namedFunc?: NamedFuncHook;
// };

// // TODO: Document
// export type NamedFuncHook = (expression: Alg.NamedExpression) => Promise<RDF.Term>;
// export type AggregateHook = (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
// export type ExistenceHook = (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
