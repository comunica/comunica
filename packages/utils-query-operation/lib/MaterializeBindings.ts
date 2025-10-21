import type { Bindings } from '@comunica/types';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { Variable } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { mapTermsNested, someTermsNested } from 'rdf-terms';

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
 * which don't appear in the projection operation will be replaced
 * by the terms bound to the variables in the given bindings.
 * @param {Algebra.Operation} operation SPARQL algebra operation.
 * And the variables that appear in the projection operation
 * will be added to a new values operation.
 * @param {Bindings} bindings A bindings object.
 * @param algebraFactory The algebra factory.
 * @param bindingsFactory The bindings factory.
 * @param options Options for materializations.
 * @param options.strictTargetVariables If target variable bindings (such as on SELECT or BIND) should not be allowed.
 * @param options.bindFilter If filter expressions should be materialized.
 * @param options.originalBindings The bindings object as it was at the top level call of materializeOperation.
 * @return Algebra.Operation A new operation materialized with the given bindings.
 */
export function materializeOperation(
  operation: Algebra.Operation,
  bindings: Bindings,
  algebraFactory: AlgebraFactory,
  bindingsFactory: BindingsFactory,
  options: {
    strictTargetVariables?: boolean;
    bindFilter?: boolean;
    originalBindings?: Bindings;
  } = {},
): Algebra.Operation {
  options = {
    strictTargetVariables: options.strictTargetVariables ?? false,
    bindFilter: options.bindFilter ?? true,
    originalBindings: options.originalBindings ?? bindings,
  };

  return algebraUtils.mapOperation(operation, {
    [Algebra.Types.PATH]: {
      preVisitor: () => ({ continue: false }),
      transform: pathOp =>
        // Materialize variables in a path expression.
        // The predicate expression will be recursed.
        Object.assign(algebraFactory.createPath(
          materializeTerm(pathOp.subject, bindings),
          pathOp.predicate,
          materializeTerm(pathOp.object, bindings),
          materializeTerm(pathOp.graph, bindings),
        ), { metadata: pathOp.metadata }),
    },
    [Algebra.Types.PATTERN]: {
      preVisitor: () => ({ continue: false }),
      transform: patternOp =>
        // Materialize variables in the quad pattern.
        Object.assign(algebraFactory.createPattern(
          materializeTerm(patternOp.subject, bindings),
          materializeTerm(patternOp.predicate, bindings),
          materializeTerm(patternOp.object, bindings),
          materializeTerm(patternOp.graph, bindings),
        ), { metadata: patternOp.metadata }),
    },
    [Algebra.Types.JOIN]: {
      preVisitor: () => ({ continue: false }),
      transform: op =>
      // Materialize join operation, and ensure metadata is taken into account.
      // Join entries with metadata should not be flattened.
        Object.assign(algebraFactory.createJoin(op.input.map(input => materializeOperation(
          input,
          bindings,
          algebraFactory,
          bindingsFactory,
          options,
        )), op.input.every(input => !input.metadata)), { metadata: op.metadata }),
    },
    [Algebra.Types.EXTEND]: { transform: (extendOp) => {
      // Materialize an extend operation.
      // If strictTargetVariables is true, we throw if the extension target variable is attempted to be bound.
      // Otherwise, we remove the extend operation.
      if (bindings.has(extendOp.variable)) {
        if (options.strictTargetVariables) {
          throw new Error(`Tried to bind variable ${termToString(extendOp.variable)} in a BIND operator.`);
        } else {
          return materializeOperation(extendOp.input, bindings, algebraFactory, bindingsFactory, options);
        }
      }
      return extendOp;
    } },
    [Algebra.Types.GROUP]: { transform: (groupOp) => {
      // Materialize a group operation.
      // If strictTargetVariables is true, we throw if the group target variable is attempted to be bound.
      // Otherwise, we just filter out the bound variables.
      if (options.strictTargetVariables) {
        for (const variable of groupOp.variables) {
          if (bindings.has(variable)) {
            throw new Error(`Tried to bind variable ${termToString(variable)} in a GROUP BY operator.`);
          }
        }
        return groupOp;
      }
      const variables = groupOp.variables.filter(variable => !bindings.has(variable));
      return algebraFactory.createGroup(
        groupOp.input,
        variables,
        groupOp.aggregates,
      );
    } },
    [Algebra.Types.FILTER]: {
      preVisitor: () => ({ continue: false }),
      transform: (filterOp) => {
        const originalBindings: Bindings = <Bindings> options.originalBindings;
        if (filterOp.expression.subType !== 'operator' || originalBindings.size === 0) {
          return filterOp;
        }

        // Make a values clause using all the variables from originalBindings.
        const values: Algebra.Operation[] = createValuesFromBindings(algebraFactory, originalBindings);

        // Recursively materialize the filter expression
        const recursionResultExpression: Algebra.Expression = <Algebra.Expression> materializeOperation(
          filterOp.expression,
          bindings,
          algebraFactory,
          bindingsFactory,
          options,
        );

        // Recursively materialize the filter input
        let recursionResultInput: Algebra.Operation = materializeOperation(
          filterOp.input,
          bindings,
          algebraFactory,
          bindingsFactory,
          options,
        );

        if (values.length > 0) {
          recursionResultInput = algebraFactory.createJoin([ ...values, recursionResultInput ]);
        }

        return algebraFactory.createFilter(recursionResultInput, recursionResultExpression);
      },
    },
    [Algebra.Types.PROJECT]: {
      preVisitor: () => ({ continue: false }),
      transform: (projectOp) => {
      // Materialize a project operation.

        // Find projected variables which are present in the originalBindings.
        // This will result in projected variables being handled via a values clause.
        const values: Algebra.Operation[] =
          createValuesFromBindings(algebraFactory, <Bindings> options.originalBindings, projectOp.variables);

        let recursionResult: Algebra.Operation = materializeOperation(
          projectOp.input,
          bindings,
          algebraFactory,
          bindingsFactory,
          options,
        );

        if (values.length > 0) {
          recursionResult = algebraFactory.createJoin([ ...values, recursionResult ]);
        }

        return algebraFactory.createProject(recursionResult, projectOp.variables);
      },
    },
    [Algebra.Types.VALUES]: {
      preVisitor: () => ({ continue: !options.strictTargetVariables }),
      transform: (valuesOp) => {
        // Materialize a values operation.
        // If strictTargetVariables is true, we throw if the values target variable is attempted to be bound.
        // Otherwise, we just filter out the bound variables and their bindings.
        if (options.strictTargetVariables) {
          for (const variable of valuesOp.variables) {
            if (bindings.has(variable)) {
              throw new Error(`Tried to bind variable ${termToString(variable)} in a VALUES operator.`);
            }
          }
          return valuesOp;
        }
        const variables = valuesOp.variables.filter(variable => !bindings.has(variable));
        const valueBindings: Algebra.Values['bindings'] = <any> valuesOp.bindings.map((binding) => {
          const newBinding = { ...binding };
          let valid = true;
          // eslint-disable-next-line unicorn/no-array-for-each
          bindings.forEach((value: RDF.Term, key: RDF.Variable) => {
            if (key.value in newBinding) {
              if (!value.equals(newBinding[key.value])) {
                // If the value of the binding is not equal, remove this binding completely from the VALUES clause
                valid = false;
              }
              delete newBinding[key.value];
            }
          });
          return valid ? newBinding : undefined;
        }).filter(Boolean);
        return algebraFactory.createValues(variables, valueBindings);
      },
    },
    [Algebra.Types.EXPRESSION]: {
      preVisitor: (expressionOp) => {
        if (!options.bindFilter) {
          return { continue: false };
        }
        if (expressionOp.subType === 'term') {
          return { continue: false };
        }
        if (expressionOp.subType === 'operator' &&
          (expressionOp.operator === 'bound' && expressionOp.args.length === 1 &&
            expressionOp.args[0].subType === 'term' && [ ...bindings.keys() ]
            .some(variable => (<Algebra.TermExpression>expressionOp.args[0]).term.equals(variable)))) {
          return { continue: false };
        }
        return { continue: true };
      },
      transform: (expressionOp) => {
        if (!options.bindFilter) {
          return expressionOp;
        }

        if (expressionOp.subType === 'term') {
          // Materialize a term expression
          return algebraFactory.createTermExpression(materializeTerm(expressionOp.term, bindings));
        }
        if (expressionOp.subType === 'operator') {
          if (expressionOp.operator === 'bound' && expressionOp.args.length === 1 &&
        expressionOp.args[0].subType === 'term' && [ ...bindings.keys() ]
            .some(variable => (<Algebra.TermExpression>expressionOp.args[0]).term.equals(variable))) {
            return algebraFactory.createTermExpression(algebraFactory.dataFactory.literal(
              'true',
              algebraFactory.dataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean'),
            ));
          }
          return expressionOp;
        }
        if (expressionOp.subType === 'aggregate' &&
      'variable' in expressionOp &&
      bindings.has(expressionOp.variable)) {
          // Materialize a bound aggregate operation.
          // If strictTargetVariables is true, we throw if the expression target variable is attempted to be bound.
          // Otherwise, we ignore this operation.
          if (options.strictTargetVariables) {
            throw new Error(`Tried to bind ${termToString(expressionOp.variable)} in a ${expressionOp.aggregator} aggregate.`);
          } else {
            return expressionOp;
          }
        }
        return expressionOp;
      },
    },
  });
}

/**
 * Make a values operation containing the values that are present in `bindings` for variables present in `variables`.
 * If no `variables` argument is given, this method returns a values operation
 * containing every binding from `bindings`.
 * @param {AlgebraFactory} factory The Factory used to create the values operation.
 * @param {Bindings} bindings A bindings object.
 * @param {Variable[]} variables A list of variables.
 * @returns Algebra.Values A new values operation the given bindings.
 */
function createValuesFromBindings(
  factory: AlgebraFactory,
  bindings: Bindings,
  variables?: Variable[],
): Algebra.Values[] {
  const values: Algebra.Values[] = [];

  for (const [ variable, binding ] of bindings) {
    if (!variables || variables.some(v => v.equals(variable))) {
      const newBinding = { [variable.value]: <RDF.NamedNode | RDF.Literal> binding };

      values.push(factory.createValues([ variable ], [ newBinding ]));
    }
  }

  return values;
}
