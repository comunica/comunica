import { KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { ActionContextKey, failTest, passTestVoid } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
  IQueryOperationResultVoid,
  IQuerySourceWrapper,
} from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * Safely cast a query operation output to a bindings output.
 * This will throw a runtime error if the output is of the incorrect type.
 * @param {IQueryOperationResult} output A query operation output.
 * @return {IQueryOperationResultBindings} A bindings query operation output.
 */
export function getSafeBindings(output: IQueryOperationResult): IQueryOperationResultBindings {
  validateQueryOutput(output, 'bindings');
  return <IQueryOperationResultBindings> output;
}

/**
 * Safely cast a query operation output to a quads output.
 * This will throw a runtime error if the output is of the incorrect type.
 * @param {IQueryOperationResult} output A query operation output.
 * @return {IQueryOperationResultQuads} A quads query operation output.
 */
export function getSafeQuads(output: IQueryOperationResult): IQueryOperationResultQuads {
  validateQueryOutput(output, 'quads');
  return <IQueryOperationResultQuads> output;
}

/**
 * Safely cast a query operation output to a boolean output.
 * This will throw a runtime error if the output is of the incorrect type.
 * @param {IQueryOperationResult} output A query operation output.
 * @return {IQueryOperationResultBoolean} A boolean query operation output.
 */
export function getSafeBoolean(output: IQueryOperationResult): IQueryOperationResultBoolean {
  validateQueryOutput(output, 'boolean');
  return <IQueryOperationResultBoolean> output;
}

/**
 * Safely cast a query operation output to a void output.
 * This will throw a runtime error if the output is of the incorrect type.
 * @param {IQueryOperationResult} output A query operation output.
 * @return {IQueryOperationResultVoid} A void query operation output.
 */
export function getSafeVoid(output: IQueryOperationResult): IQueryOperationResultVoid {
  validateQueryOutput(output, 'void');
  return <IQueryOperationResultVoid> output;
}

/**
 * Throw an error if the output type does not match the expected type.
 * @param {IQueryOperationResult} output A query operation output.
 * @param {string} expectedType The expected output type.
 */
export function validateQueryOutput(output: IQueryOperationResult, expectedType: IQueryOperationResult['type']): void {
  if (output.type !== expectedType) {
    throw new Error(`Invalid query output type: Expected '${expectedType}' but got '${output.type}'`);
  }
}

/**
 * Test if the context contains the readOnly flag.
 * @param context An action context.
 */
export function testReadOnly(context: IActionContext): TestResult<any> {
  if (context.get(KeysQueryOperation.readOnly)) {
    return failTest(`Attempted a write operation in read-only mode`);
  }
  return passTestVoid();
}

/**
 * Obtain the query source attached to the given operation.
 * @param operation An algebra operation.
 */
export function getOperationSource(operation: Algebra.Operation): IQuerySourceWrapper | undefined {
  return <IQuerySourceWrapper> operation.metadata?.scopedSource;
}

/**
 * Assign a source wrapper to the given operation.
 * The operation is copied and returned.
 * @param operation An operation.
 * @param source A source wrapper.
 */
export function assignOperationSource<O extends Algebra.Operation>(operation: O, source: IQuerySourceWrapper): O {
  operation = { ...operation };
  operation.metadata = operation.metadata ? { ...operation.metadata } : {};
  operation.metadata.scopedSource = source;
  return operation;
}

/**
 * Remove the source wrapper from the given operation.
 * The operation is mutated.
 * @param operation An operation.
 */
export function removeOperationSource(operation: Algebra.Operation): void {
  delete operation.metadata?.scopedSource;
  if (operation.metadata && Object.keys(operation.metadata).length === 0) {
    delete operation.metadata;
  }
}

/**
 * Sets KEY_CONTEXT_WRAPPED_QUERY_OPERATION to the operation being executed.
 * @param operation The query operation.
 * @param context The current action context.
 * @returns A new action context with the operation marked as wrapped.
 */
export function setContextWrapped(operation: Algebra.Operation, context: IActionContext): IActionContext {
  return context.set(KEY_CONTEXT_WRAPPED_QUERY_OPERATION, operation);
}

/**
 * Key that that stores the last executed operation
 */
export const KEY_CONTEXT_WRAPPED_QUERY_OPERATION = new ActionContextKey<Algebra.Operation>(
  '@comunica/actor-query-operation:wrapped',
);
