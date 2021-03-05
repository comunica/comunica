import type { Bindings as _Bindings, BindingsStream } from '@comunica/types';
import { Map } from 'immutable';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import type { Algebra, Factory } from 'sparqlalgebrajs';
import { Util } from 'sparqlalgebrajs';

export type Bindings = _Bindings;

export type { BindingsStream };

/**
 * A convenience constructor for bindings based on a given hash.
 * @param {{[p: string]: RDF.Term}} hash A hash that maps variable names to terms.
 * @return {Bindings} The immutable bindings from the hash.
 * @constructor
 */
// eslint-disable-next-line no-redeclare
export function Bindings(hash: Record<string, RDF.Term>): Bindings {
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

/**
 * Materialize a term with the given binding.
 *
 * If the given term is a variable,
 * and that variable exist in the given bindings object,
 * the value of that binding is returned.
 * In all other cases, the term itself is returned.
 *
 * @param {RDF.Term} term A term.
 * @param {Bindings} bindings A bindings object.
 * @return {RDF.Term} The materialized term.
 */
export function materializeTerm(term: RDF.Term, bindings: Bindings): RDF.Term {
  if (term.termType === 'Variable') {
    const value: RDF.Term = bindings.get(termToString(term));
    if (value) {
      return value;
    }
  }
  return term;
}

/**
 * Materialize the given operation (recursively) with the given bindings.
 * Essentially, all variables in the given operation will be replaced
 * by the terms bound to the variables in the given bindings.
 * @param {Operation} operation SPARQL algebra operation.
 * @param {Bindings} bindings A bindings object.
 * @param {boolean} strictTargetVariables If target variable bindings (such as on SELECT or BIND) should not be allowed.
 * @return Algebra.Operation A new operation materialized with the given bindings.
 */
export function materializeOperation(operation: Algebra.Operation, bindings: Bindings,
  strictTargetVariables = false): Algebra.Operation {
  return Util.mapOperation(operation, {
    path(op: Algebra.Path, factory: Factory) {
      // Materialize variables in a path expression.
      // The predicate expression will be recursed.
      return {
        recurse: false,
        result: factory.createPath(
          materializeTerm(op.subject, bindings),
          op.predicate,
          materializeTerm(op.object, bindings),
          materializeTerm(op.graph, bindings),
        ),
      };
    },
    pattern(op: Algebra.Pattern, factory: Factory) {
      // Materialize variables in the quad pattern.
      return {
        recurse: false,
        result: factory.createPattern(
          materializeTerm(op.subject, bindings),
          materializeTerm(op.predicate, bindings),
          materializeTerm(op.object, bindings),
          materializeTerm(op.graph, bindings),
        ),
      };
    },
    extend(op: Algebra.Extend) {
      // Materialize an extend operation.
      // If strictTargetVariables is true, we throw if the extension target variable is attempted to be bound.
      // Otherwise, we remove the extend operation.
      if (bindings.has(termToString(op.variable))) {
        if (strictTargetVariables) {
          throw new Error(`Tried to bind variable ${termToString(op.variable)} in a BIND operator.`);
        } else {
          return {
            recurse: true,
            result: materializeOperation(op.input, bindings, strictTargetVariables),
          };
        }
      }
      return {
        recurse: true,
        result: op,
      };
    },
    group(op: Algebra.Group, factory: Factory) {
      // Materialize a group operation.
      // If strictTargetVariables is true, we throw if the group target variable is attempted to be bound.
      // Otherwise, we just filter out the bound variables.
      if (strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(termToString(variable))) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a GROUP BY operator.`);
          }
        }
        return {
          recurse: true,
          result: op,
        };
      }
      const variables = op.variables.filter(variable => !bindings.has(termToString(variable)));
      return {
        recurse: true,
        result: factory.createGroup(
          op.input,
          variables,
          op.aggregates,
        ),
      };
    },
    project(op: Algebra.Project, factory: Factory) {
      // Materialize a project operation.
      // If strictTargetVariables is true, we throw if the project target variable is attempted to be bound.
      // Otherwise, we just filter out the bound variables.
      if (strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(termToString(variable))) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a SELECT operator.`);
          }
        }
        return {
          recurse: true,
          result: op,
        };
      }
      const variables = op.variables.filter(variable => !bindings.has(termToString(variable)));
      return {
        recurse: true,
        result: factory.createProject(
          op.input,
          variables,
        ),
      };
    },
    values(op: Algebra.Values, factory: Factory) {
      // Materialize a values operation.
      // If strictTargetVariables is true, we throw if the values target variable is attempted to be bound.
      // Otherwise, we just filter out the bound variables and their bindings.
      if (strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(termToString(variable))) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a VALUES operator.`);
          }
        }
      } else {
        const variables = op.variables.filter(variable => !bindings.has(termToString(variable)));
        const valueBindings = op.bindings.map(binding => {
          const newBinding = { ...binding };
          bindings.forEach((value: RDF.NamedNode, key: string) => delete newBinding[key]);
          return newBinding;
        });
        return {
          recurse: true,
          result: factory.createValues(
            variables,
            valueBindings,
          ),
        };
      }
      return {
        recurse: false,
        result: op,
      };
    },
    expression(op: Algebra.Expression, factory: Factory) {
      if (op.expressionType === 'term') {
        // Materialize a term expression
        return {
          recurse: false,
          result: factory.createTermExpression(materializeTerm(op.term, bindings)),
        };
      }
      if (op.expressionType === 'aggregate' &&
        'variable' in op &&
        bindings.has(termToString(<RDF.Variable> op.variable))) {
        // Materialize a bound aggregate operation.
        // If strictTargetVariables is true, we throw if the expression target variable is attempted to be bound.
        // Otherwise, we ignore this operation.
        if (strictTargetVariables) {
          throw new Error(`Tried to bind ${termToString(op.variable)} in a ${op.aggregator} aggregate.`);
        } else {
          return {
            recurse: true,
            result: op,
          };
        }
      }
      return {
        recurse: true,
        result: op,
      };
    },
  });
}
