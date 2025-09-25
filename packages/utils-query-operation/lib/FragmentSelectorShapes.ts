import type { FragmentSelectorShape } from '@comunica/types';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * Check if the given shape accepts the given query operation.
 * @param shape A shape to test the query operation against.
 * @param operation A query operation to test.
 * @param options Additional options to consider.
 * @param options.joinBindings If additional bindings will be pushed down to the source for joining.
 * @param options.filterBindings If additional bindings will be pushed down to the source for filtering.
 */
export function doesShapeAcceptOperation(
  shape: FragmentSelectorShape,
  operation: Algebra.Operation,
  options?: FragmentSelectorShapeTestFlags,
): boolean {
  return doesShapeAcceptOperationRecurseShape(shape, shape, operation, options);
}

function doesShapeAcceptOperationRecurseShape(
  shapeTop: FragmentSelectorShape,
  shapeActive: FragmentSelectorShape,
  operation: Algebra.Operation,
  options?: FragmentSelectorShapeTestFlags,
): boolean {
  // Recurse into the shape
  if (shapeActive.type === 'conjunction') {
    return shapeActive.children
      .every(child => doesShapeAcceptOperationRecurseShape(shapeTop, child, operation, options));
  }
  if (shapeActive.type === 'disjunction') {
    return shapeActive.children
      .some(child => doesShapeAcceptOperationRecurseShape(shapeTop, child, operation, options));
  }
  if (shapeActive.type === 'negation') {
    return !doesShapeAcceptOperationRecurseShape(shapeActive.child, shapeActive.child, operation, options);
  }
  if (shapeActive.type === 'arity') {
    return doesShapeAcceptOperationRecurseShape(shapeTop, shapeActive.child, operation, options);
  }

  // Validate options
  if ((options?.joinBindings && !shapeActive.joinBindings) ??
    (options?.filterBindings && !shapeActive.filterBindings)) {
    return false;
  }

  // Check if the shape's operation matches with the given operation
  const shapeOperation = shapeActive.operation;
  switch (shapeOperation.operationType) {
    case 'type': {
      if (shapeOperation.type === Algebra.types.EXPRESSION && isExtensionFunction(operation) &&
        !('extensionFunctions' in shapeOperation &&
        shapeOperation.extensionFunctions?.includes(operation.name.value))) {
        return false;
      }
      if (!doesShapeAcceptOperationRecurseOperationAndShape(shapeTop, shapeActive.children, operation, options) &&
        !doesShapeAcceptOperationRecurseOperation(shapeTop, operation, options)) {
        return false;
      }
      return shapeOperation.type === operation.type;
    }
    case 'pattern': {
      if (doesShapeAcceptOperationRecurseOperationAndShape(shapeTop, shapeActive.children, operation, options) &&
        !doesShapeAcceptOperationRecurseOperation(shapeTop, operation, options)) {
        return false;
      }
      return shapeOperation.pattern.type === operation.type;
    }
    case 'wildcard': {
      // All possible operations are accepted by this shape.
      // As exception, extension functions are not accepted through wildcards.
      if (options?.wildcardAcceptAllExtensionFunctions) {
        return true;
      }
      if (isExtensionFunction(operation)) {
        return false;
      }
      // Also check for nested extension functions,
      // and only accept the wildcard if all nested extension functions are supported by the query shape.
      let hasUnsupportedExtensionFunction = false;
      Util.recurseOperation(operation, {
        [Algebra.types.EXPRESSION](subOp) {
          if (isExtensionFunction(subOp) && !doesShapeAcceptOperation(shapeTop, subOp, options)) {
            hasUnsupportedExtensionFunction = true;
            return false;
          }
          return true;
        },
      });
      return !hasUnsupportedExtensionFunction;
    }
  }
}

function doesShapeAcceptOperationRecurseOperationAndShape(
  shapeTop: FragmentSelectorShape,
  shapeActiveChildren: FragmentSelectorShape[] | undefined,
  operation: Algebra.Operation,
  options?: FragmentSelectorShapeTestFlags,
): boolean {
  if (isExtensionFunction(operation) || isExtensionFunction(operation.expression)) {
    return false;
  }
  if (shapeActiveChildren) {
    const operationInputs: Algebra.Operation[] = operation.input ?
        (Array.isArray(operation.input) ? operation.input : [ operation.input ]) :
      operation.patterns ?? [];
    for (const [ i, shapeActiveChild ] of shapeActiveChildren.entries()) {
      if (!operationInputs[i] ||
        !doesShapeAcceptOperationRecurseShape(shapeTop, shapeActiveChild, operationInputs[i], options)) {
        return false;
      }
    }
  }
  return true;
}

function doesShapeAcceptOperationRecurseOperation(
  shapeTop: FragmentSelectorShape,
  operation: Algebra.Operation,
  options?: FragmentSelectorShapeTestFlags,
): boolean {
  // Recurse into the operation, and restart from the top-level shape
  if (operation.input) {
    const inputs: Algebra.Operation[] = Array.isArray(operation.input) ? operation.input : [ operation.input ];
    if (!inputs.every(input => doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, input, options))) {
      return false;
    }
  }
  if (operation.expression && isExtensionFunction(operation.expression) &&
    !doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, operation.expression, options)) {
    return false;
  }
  return !(operation.patterns && !operation.patterns
    .every((input: Algebra.Pattern) => doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, input, options)));
}

function isStandardSparqlFunction(iri: string): boolean {
  return /^https?:\/\/www\.w3\.org\//u.test(iri);
}

function isExtensionFunction(operation: Algebra.Operation): boolean {
  return operation && operation.type === Algebra.types.EXPRESSION &&
    operation.expressionType === Algebra.expressionTypes.NAMED && !isStandardSparqlFunction(operation.name.value);
}

export type FragmentSelectorShapeTestFlags = {
  joinBindings?: boolean;
  filterBindings?: boolean;
  wildcardAcceptAllExtensionFunctions?: boolean;
};
