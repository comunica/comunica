import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import { Algebra, algebraUtils, isKnownSubType } from '@comunica/utils-algebra';

/**
 * Check if the given operation contains an `EXISTS` or `NOT EXISTS` that the existence resolver of the context
 * answers, so that it must not be delegated to a source. Those from the body of a SERVICE clause are exempt.
 * @param operation An operation to inspect.
 * @param context The action context, which may hold an existence resolver.
 * @return If the operation contains such an expression.
 */
export function containsCallerResolvedExistence(operation: Algebra.Operation, context: IActionContext): boolean {
  if (!context.get(KeysExpressionEvaluator.existenceResolver)) {
    return false;
  }
  let found = false;
  algebraUtils.visitOperation(operation, {
    [Algebra.Types.SERVICE]: {
      preVisitor: () => ({ continue: false }),
    },
    [Algebra.Types.EXPRESSION]: {
      preVisitor: (expression: Algebra.Expression) => {
        if (isKnownSubType(expression, Algebra.ExpressionTypes.EXISTENCE)) {
          if (isExistenceWithinService(expression)) {
            return { continue: false };
          }
          found = true;
          return { shortcut: true };
        }
        return {};
      },
    },
  });
  return found;
}

/**
 * Mark the given `EXISTS` or `NOT EXISTS` expression as part of the body of a SERVICE clause,
 * so that it is evaluated over the target of that clause, and never by an existence resolver.
 * @param expression An existence expression within the body of a SERVICE clause.
 * @return A marked copy of the expression.
 */
export function markExistenceWithinService(expression: Algebra.ExistenceExpression): Algebra.ExistenceExpression {
  const marked = algebraUtils.withMetadata({ ...expression });
  marked.metadata = { ...marked.metadata, withinService: true };
  return marked;
}

/**
 * Check if the given `EXISTS` or `NOT EXISTS` expression is marked as part of the body of a SERVICE clause.
 * @param expression An existence expression.
 * @return If the expression is marked.
 */
export function isExistenceWithinService(expression: Algebra.ExistenceExpression): boolean {
  return Boolean(expression.metadata?.withinService);
}
