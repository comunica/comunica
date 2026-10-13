import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IPhysicalQueryPlanLogger, IPhysicalQueryPlanNode } from '@comunica/types';
import { groupRepeatedSubOperations } from '../lib/PhysicalQueryPlan';

describe('groupRepeatedSubOperations', () => {
  it('should return the context unchanged without a physical query plan logger', () => {
    const context = new ActionContext();
    expect(groupRepeatedSubOperations(context, 'bindings', 'actor')).toBe(context);
  });

  it('should log a repeated node under the current node', () => {
    const parentNode = <IPhysicalQueryPlanNode> <unknown> { id: 'parent' };
    const groupNode = <IPhysicalQueryPlanNode> <unknown> { id: 'group' };
    const logger = <IPhysicalQueryPlanLogger> <unknown> { logOperation: vi.fn(() => groupNode) };
    const operation = {};
    const context = new ActionContext()
      .set(KeysInitQuery.physicalQueryPlanLogger, logger)
      .set(KeysInitQuery.physicalQueryPlanNode, parentNode);

    expect(groupRepeatedSubOperations(context, 'bindings', 'actor', operation)
      .get(KeysInitQuery.physicalQueryPlanNode)).toBe(groupNode);
    expect(logger.logOperation).toHaveBeenCalledWith({
      logicalOperator: 'bindings',
      parentNode,
      actor: 'actor',
      operation,
      repeated: true,
    });
  });
});
