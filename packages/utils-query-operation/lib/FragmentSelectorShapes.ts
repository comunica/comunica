import type { FragmentSelectorShape } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

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
      return true;
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
  return !(operation.patterns && !operation.patterns
    .every((input: Algebra.Pattern) => doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, input, options)));
}

/**
 * Check if the given shape accepts the given extension Function.
 * @param shape A shape to test the query operation against.
 * @param extensionFunction An extension function to test.
 */
export function doesShapeAcceptExtensionFunction(
  shape: FragmentSelectorShape,
  extensionFunction: string,
): boolean {
  return doesShapeAcceptExtensionFunctionRecurse(shape, extensionFunction);
}

function doesShapeAcceptExtensionFunctionRecurse(
  shape: FragmentSelectorShape,
  extensionFunction: string,
): boolean {
  // Recurse into the shape
  if (shape.type === 'conjunction') {
    return shape.children
      .every(child => doesShapeAcceptExtensionFunctionRecurse(child, extensionFunction));
  }
  if (shape.type === 'disjunction') {
    return shape.children
      .some(child => doesShapeAcceptExtensionFunctionRecurse(child, extensionFunction));
  }
  if (shape.type === 'arity') {
    return doesShapeAcceptExtensionFunctionRecurse(shape.child, extensionFunction);
  }

  return <boolean> shape.extensionFunctions?.includes(extensionFunction);
}

export type FragmentSelectorShapeTestFlags = {
  joinBindings?: boolean;
  filterBindings?: boolean;
};
