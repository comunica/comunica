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
   * Remove all matching children from the given node,
   * @param node The node to remove children from.
   * @param filter The filter to keep children by. If undefined, all children will be removed.
   */
  stashChildren: (
    node: any,
    filter?: (planNodeFilter: IPlanNode) => boolean,
  ) => void;

  /**
   * Add the given child to the given parent node.
   * @param node A node to add to the parent.
   * @param parentNode The parent to add to.
   */
  unstashChild: (
    node: any,
    parentNode: any,
  ) => void;

  /**
   * Append the given metadata to the given node.
   * @param node The node to add metadata to.
   * @param metadata The metadata to add.
   */
  appendMetadata: (
    node: any,
    metadata: any,
  ) => void;

  /**
   * Serialize the collected query plan to JSON.
   */
  toJson: () => any;
}

export interface IPlanNode {
  actor: string;
  logicalOperator: string;
  physicalOperator?: string;
  rawNode: any;
  children: IPlanNode[];
  metadata: any;
}
