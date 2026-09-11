import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext, IPhysicalQueryPlanLogger } from '@comunica/types';

/**
 * Group the operations that will be executed within the returned context under a single node of the
 * physical query plan.
 *
 * Operations that evaluate a sub-operation once per binding, such as bind joins, `EXISTS` filters and
 * arbitrary-length property paths, would otherwise report every evaluation as a separate child, next
 * to their actual inputs. Grouping them makes the repetition explicit, and lets the plan summarize
 * the repeated evaluations without hiding anything else.
 *
 * The given context is returned unchanged when no physical query plan is being logged.
 *
 * @param context The context that the repeated sub-operations will be executed in.
 * @param logicalOperator A name for what is being repeated, such as `bindings` or `exists`.
 * @param actor The name of the actor that repeats the sub-operations.
 */
export function groupRepeatedSubOperations(
  context: IActionContext,
  logicalOperator: string,
  actor?: string,
): IActionContext {
  const logger: IPhysicalQueryPlanLogger | undefined = context.get(KeysInitQuery.physicalQueryPlanLogger);
  if (!logger) {
    return context;
  }
  return context.set(KeysInitQuery.physicalQueryPlanNode, logger.logOperation({
    logicalOperator,
    parentNode: context.get(KeysInitQuery.physicalQueryPlanNode),
    actor,
    repeated: true,
  }));
}
