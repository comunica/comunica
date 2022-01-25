/**
 * A physical query plan logger collects operations, which can then be serialized as a query plan to JSON.
 */
export interface IPhysicalQueryPlanLogger {
  /**
   * Log an operation.
   *
   * Important here is that the `node` and `parentNode` can be of any type,
   * as long as they properly reference each other in subsequent calls.
   * These node references can be used to build up a hierarchy.
   *
   * @param logicalOperator The current logical query operator.
   * @param physicalOperator The current physical query operator.
   *                         This may be omitted if no physical operator applies.
   * @param node The current operation node.
   * @param parentNode The parent operation node.
   * @param actor The current actor name.
   * @param metadata Metadata to include together in the physical query plan output for this node.
   */
  logOperation: (
    logicalOperator: string,
    physicalOperator: string | undefined,
    node: any,
    parentNode: any,
    actor: string,
    metadata: any,
  ) => void;
  /**
   * Serialize the collected query plan to JSON.
   */
  toJson: () => any;
}
