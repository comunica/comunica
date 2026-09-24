import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import { Algebra, algebraUtils, isKnownSubType } from '@comunica/utils-algebra';

/**
 * Check if the given operation contains an `EXISTS` or `NOT EXISTS` that the caller resolves itself,
 * through a `KeysExpressionEvaluator.existenceResolver` in the context.
 *
 * Such an operation must not be delegated to a query source: the source would answer the `EXISTS`
 * against its own data, which silently bypasses the resolver that the caller installed for it.
 * The body of a SERVICE clause is exempt, also once source assignment has replaced that clause by its body
 * (see {@link markExistenceWithinService}).
 * @param operation An operation to inspect.
 * @param context The action context, which may hold an existence resolver.
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
        return { shortcut: false };
      },
    },
  });
  return found;
}

/**
 * Mark the given `EXISTS` or `NOT EXISTS` expression as part of the body of a SERVICE clause.
 * Such an expression has the data of the target of that clause in scope, so it is evaluated over that target,
 * and never by a caller's existence resolver.
 * Once the clause has been replaced by its body, the expression can otherwise not be told apart from others.
 * @param expression An existence expression within the body of a SERVICE clause.
 */
export function markExistenceWithinService(expression: Algebra.ExistenceExpression): Algebra.ExistenceExpression {
  const marked = algebraUtils.withMetadata({ ...expression });
  marked.metadata = { ...marked.metadata, withinService: true };
  return marked;
}

/**
 * Check if the given `EXISTS` or `NOT EXISTS` expression is marked as part of the body of a SERVICE clause.
 * @param expression An existence expression.
 */
export function isExistenceWithinService(expression: Algebra.ExistenceExpression): boolean {
  return Boolean(expression.metadata?.withinService);
}
