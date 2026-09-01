/**
 * A physical query plan logger collects operations, which can then be serialized as a query plan to JSON.
 */
export interface IPhysicalQueryPlanLogger {
  /**
   * Log an operation, and obtain a handle to the plan node that was created for it.
   *
   * Every call creates a distinct node, so an operation that is executed more than once
   * results in more than one node. Hierarchies are built by passing the handle of an
   * earlier call as `parentNode`. Exactly one node may be logged without a parent.
   *
   * @param args The operation to log.
   * @return A handle to the created node.
   */
  logOperation: (args: ILogOperationArgs) => IPhysicalQueryPlanNode;

  /**
   * Obtain the node that produced the given query operation output.
   *
   * Nodes are associated with an output via {@link IPhysicalQueryPlanNode#setOutput},
   * which allows operations that consume an output to find the node that produced it,
   * without having to pass plan nodes around themselves.
   *
   * @param output A query operation output.
   * @return The node that produced the output, or undefined if the output is unknown.
   */
  getNodeForOutput: (output: unknown) => IPhysicalQueryPlanNode | undefined;

  /**
   * Wait for all outstanding measurements of this plan to complete.
   *
   * Statistics such as the produced number of results are only known once a node's output has been
   * consumed. Serializing the plan without awaiting this first yields a plan that varies between
   * runs, so this must be awaited before {@link IPhysicalQueryPlanLogger#toJson}.
   */
  finalize: () => Promise<void>;

  /**
   * Serialize the collected query plan to JSON.
   */
  toJson: () => any;
}

export interface ILogOperationArgs {
  /**
   * The current logical query operator.
   */
  logicalOperator: string;
  /**
   * The current physical query operator.
   * This may be omitted if no physical operator applies.
   */
  physicalOperator?: string;
  /**
   * The node this operation is executed within, or undefined for the root of the plan.
   */
  parentNode?: IPhysicalQueryPlanNode;
  /**
   * The current actor name.
   */
  actor: string;
  /**
   * Metadata to include together in the physical query plan output for this node.
   */
  metadata?: any;
  /**
   * The algebra operation this node was created for, if any.
   * This is used to derive logical details such as the triple pattern or the projected variables.
   */
  operation?: any;
}

/**
 * A handle to a single node within a physical query plan.
 */
export interface IPhysicalQueryPlanNode {
  /**
   * Append the given metadata to this node.
   * @param metadata The metadata to add.
   */
  appendMetadata: (metadata: any) => void;

  /**
   * Adopt the given node as an input of this node, moving it and its subtree out of its current parent.
   *
   * This is needed by operations that only learn which node their inputs belong under after those
   * inputs have already been executed, such as join actors that are selected after their entries
   * have been evaluated.
   *
   * Inputs are kept apart from the sub-operations that this node executes itself, so that repeated
   * sub-operations, such as those of a bind join, can be summarized without hiding the inputs.
   *
   * @param node The node to adopt.
   */
  adoptInput: (node: IPhysicalQueryPlanNode) => void;

  /**
   * Associate the given query operation output with this node.
   *
   * This lets consumers of the output find this node via
   * {@link IPhysicalQueryPlanLogger#getNodeForOutput}, and lets the logger measure the output,
   * so that the node reports how many results it produced and how long that took.
   *
   * @param output A query operation output.
   */
  setOutput: (output: unknown) => void;
}
