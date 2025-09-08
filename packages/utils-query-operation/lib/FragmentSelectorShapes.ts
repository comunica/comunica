import type { FragmentSelectorShape } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

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
      if (shapeOperation.type === Algebra.types.EXPRESSION &&
        isExtensionFunction(operation)) {
        // Extension functions check
        return <boolean> ('extensionFunctions' in shapeOperation &&
          shapeOperation.extensionFunctions?.includes(operation.name.value));
      }
      if (!doesShapeAcceptOperationRecurseOperation(shapeTop, shapeActive, operation, options)) {
        return false;
      }
      return shapeOperation.type === operation.type;
    }
    case 'pattern': {
      if (!doesShapeAcceptOperationRecurseOperation(shapeTop, shapeActive, operation, options)) {
        return false;
      }
      return shapeOperation.pattern.type === operation.type;
    }
    case 'wildcard': {
      // All possible operations are accepted by this shape.
      // As exception, extension functions are not accepted through wildcards.
      return !isExtensionFunction(operation);
    }
  }
}

function doesShapeAcceptOperationRecurseOperation(
  shapeTop: FragmentSelectorShape,
  shapeActive: FragmentSelectorShape,
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

function isBuiltInFunctionIRI(iri: string): boolean {
  return iri.includes('w3.org/2005/xpath-functions#') ||
    iri.includes('w3.org/2001/XMLSchema#');
}

function isExtensionFunction(operation: Algebra.Operation): boolean {
  return operation.type === Algebra.types.EXPRESSION && operation.expressionType === Algebra.expressionTypes.NAMED &&
    !isBuiltInFunctionIRI(operation.name.value);
}

export type FragmentSelectorShapeTestFlags = {
  joinBindings?: boolean;
  filterBindings?: boolean;
};
