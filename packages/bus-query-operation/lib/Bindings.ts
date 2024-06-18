import type { BindingsFactory } from '@comunica/bindings-factory';
import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { mapTermsNested, someTermsNested } from 'rdf-terms';
import type { Algebra, Factory } from 'sparqlalgebrajs';
import { Util } from 'sparqlalgebrajs';

const DF = new DataFactory();

const TRUE = DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));

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
    // Replace the variable with it's value in the InitialBindings
    const value = bindings.get(term);
    if (value) {
      return value;
    }
  }
  if (term.termType === 'Quad' && someTermsNested(term, value => value.termType === 'Variable')) {
    return mapTermsNested(term, subTerm => materializeTerm(subTerm, bindings));
  }
  return term;
}

/**
 * Materialize the given operation (recursively) with the given bindings.
 * Essentially, the variables in the given operation
 * which don't appear in the SELECT clause will be replaced
 * by the terms bound to the variables in the given bindings.
 * @param {Algebra.Operation} operation SPARQL algebra operation.
 * And the variables that appear in the SELECT clause
 * will be added to a VALUES clause.
 * @param {Bindings} bindings A bindings object.
 * @param bindingsFactory The bindings factory.
 * @param options Options for materializations.
 * @param options.strictTargetVariables If target variable bindings (such as on SELECT or BIND) should not be allowed.
 * @param options.bindFilter If filter expressions should be materialized
 * @return Algebra.Operation A new operation materialized with the given bindings.
 */
export function materializeOperation(
  operation: Algebra.Operation,
  bindings: Bindings,
  bindingsFactory: BindingsFactory,
  options: {
    strictTargetVariables?: boolean;
    bindFilter?: boolean;
  } = {},
  originalBindings?: Bindings,
): Algebra.Operation {
  options = {
    strictTargetVariables: 'strictTargetVariables' in options ? options.strictTargetVariables : false,
    bindFilter: 'bindFilter' in options ? options.bindFilter : true,
  };

  return Util.mapOperation(operation, {
    path(op: Algebra.Path, factory: Factory) {
      // Materialize variables in a path expression.
      // The predicate expression will be recursed.
      return {
        recurse: false,
        result: Object.assign(factory.createPath(
          materializeTerm(op.subject, bindings),
          op.predicate,
          materializeTerm(op.object, bindings),
          materializeTerm(op.graph, bindings),
        ), { metadata: op.metadata }),
      };
    },
    pattern(op: Algebra.Pattern, factory: Factory) {
      // Materialize variables in the quad pattern.
      return {
        recurse: false,
        result: Object.assign(factory.createPattern(
          materializeTerm(op.subject, bindings),
          materializeTerm(op.predicate, bindings),
          materializeTerm(op.object, bindings),
          materializeTerm(op.graph, bindings),
        ), { metadata: op.metadata }),
      };
    },
    extend(op: Algebra.Extend) {
      // Materialize an extend operation.
      // If strictTargetVariables is true, we throw if the extension target variable is attempted to be bound.
      // Otherwise, we remove the extend operation.
      if (bindings.has(op.variable)) {
        if (options.strictTargetVariables) {
          throw new Error(`Tried to bind variable ${termToString(op.variable)} in a BIND operator.`);
        } else {
          return {
            recurse: true,
            result: materializeOperation(op.input, bindings, bindingsFactory, options),
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
      if (options.strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(variable)) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a GROUP BY operator.`);
          }
        }
        return {
          recurse: true,
          result: op,
        };
      }
      const variables = op.variables.filter(variable => !bindings.has(variable));
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
      // Otherwise, we make a values clause out of the target variable and its value in InitialBindings.
      if (options.strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(variable)) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a SELECT operator.`);
          }
        }
        return {
          recurse: true,
          result: op,
        };
      }

      // Only include non-projected variables in the sub-bindings that will be passed down recursively.
      // This will result in non-projected variables being replaced with their InitialBindings values.
      let subBindings = bindingsFactory.fromBindings(bindings);
      bindings.forEach((_, key) => {
        for (let curVariable of op.variables) {
          if (termToString(curVariable) === termToString(key)) {
            subBindings = subBindings.delete(key);
            break;
          }
        }
      });

      // Find projected variables which are present in the InitialBindings
      // This will result in projected variables being handled via a values clause.
      const values: Algebra.Operation[] = [];
      const overlappingVariables: RDF.Variable[] = [];
      const overlappingBindings: Record<string, RDF.Literal | RDF.NamedNode>[] = [];
      originalBindings = originalBindings ? originalBindings : bindings;
      for (const currentVariable of op.variables) {
        if (originalBindings.has(currentVariable)) {
          const newBinding = { [termToString(currentVariable)]:
            <RDF.NamedNode | RDF.Literal> originalBindings.get(currentVariable) };

          overlappingVariables.push(currentVariable);
          overlappingBindings.push(newBinding);
          values.push(factory.createValues([currentVariable], [newBinding]));
        }
      }

      let recursionResult: Algebra.Operation = materializeOperation(
        op.input,
        subBindings,
        bindingsFactory,
        options,
        originalBindings,
      );

      if (values.length > 0) {
        recursionResult = factory.createJoin(values.concat([recursionResult]));
      }

      return {
        recurse: false,
        result: factory.createProject(recursionResult, op.variables),
      };
    },
    filter(op: Algebra.Filter, factory: Factory) {
      originalBindings = originalBindings ? originalBindings : bindings;

      if (op.expression.expressionType !== "operator" || originalBindings.size === 0) {
        return {
          recurse: false,
          result: op,
        }
      }

      // Make a values clause using all the variables from InitialBindings
      const values: Algebra.Operation[] = [];
      for (let [variable, binding] of originalBindings) {
        const newBinding = { [termToString(variable)]: <RDF.NamedNode | RDF.Literal> binding };
        values.push(factory.createValues([variable], [newBinding]));
      }

      // Recursively materialize the filter expression
      let recursionResultExpression: Algebra.Expression = <Algebra.Expression> materializeOperation(
        op.expression,
        bindings,
        bindingsFactory,
        options,
        originalBindings,
      );

      // Recursively materialize the filter input
      let recursionResultInput: Algebra.Operation = materializeOperation(
        op.input,
        bindings,
        bindingsFactory,
        options,
        originalBindings,
      );

      return {
        recurse: false, // Recursion already taken care of above.
        result: factory.createFilter(factory.createJoin(values.concat([recursionResultInput])), recursionResultExpression),
      }
    },
    values(op: Algebra.Values, factory: Factory) {
      // Materialize a values operation.
      // If strictTargetVariables is true, we throw if the values target variable is attempted to be bound.
      // Otherwise, we just filter out the bound variables and their bindings.
      if (options.strictTargetVariables) {
        for (const variable of op.variables) {
          if (bindings.has(variable)) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a VALUES operator.`);
          }
        }
      } else {
        const variablesNotInitialBindings = op.variables.filter(variable => !bindings.has(variable));
        const valueBindings: Record<string, RDF.Literal | RDF.NamedNode>[] = <any> op.bindings.map((binding) => {
          const newBinding = { ...binding };
          let valid = true;
          // eslint-disable-next-line unicorn/no-array-for-each
          bindings.forEach((value: RDF.Term, key: RDF.Variable) => {
            const keyString = termToString(key);
            if (keyString in newBinding) {
              if (!value.equals(newBinding[keyString])) {
                // If the value of the binding is not equal, remove this binding completely from the VALUES clause
                valid = false;
              }
              delete newBinding[keyString];
            }
          });
          return valid ? newBinding : undefined;
        }).filter(Boolean);
        return {
          recurse: true,
          result: factory.createValues(
            variablesNotInitialBindings,
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
      if (!options.bindFilter) {
        return {
          recurse: false,
          result: op,
        };
      }

      if (op.expressionType === 'term') {
        // Materialize a term expression
        return {
          recurse: false,
          result: factory.createTermExpression(materializeTerm(op.term, bindings)),
        };
      }
      if (op.expressionType === 'operator') {
        if (op.operator === 'bound' && op.args.length === 1 && op.args[0].expressionType === 'term' &&
          [ ...bindings.keys() ].some(variable => op.args[0].term.equals(variable))) {
          return {
            recurse: false,
            result: factory.createTermExpression(TRUE),
          };
        }
        return {
          recurse: true,
          result: op,
        };
      }
      if (op.expressionType === 'aggregate' &&
        'variable' in op &&
        bindings.has(<RDF.Variable> op.variable)) {
        // Materialize a bound aggregate operation.
        // If strictTargetVariables is true, we throw if the expression target variable is attempted to be bound.
        // Otherwise, we ignore this operation.
        if (options.strictTargetVariables) {
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
