import type { ILogOperationArgs, IPhysicalQueryPlanNode } from '@comunica/types';
import type { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

/**
 * A single node within a physical query plan that is held in memory.
 *
 * Nodes are created by {@link MemoryPhysicalQueryPlanLogger#logOperation} and are the only way
 * to refer to a plan node. Because a node is created per operation execution, and never derived
 * from an object that the engine also uses for something else, two executions can never collide.
 */
export class MemoryPlanNode implements IPhysicalQueryPlanNode {
  public readonly logger: MemoryPhysicalQueryPlanLogger;
  public readonly actor: string | undefined;
  public readonly logicalOperator: string;
  public readonly physicalOperator: string | undefined;
  public readonly operation: any;
  public readonly repeated: boolean;
  public readonly children: MemoryPlanNode[] = [];
  public parent: MemoryPlanNode | undefined;
  public metadata: any;

  public constructor(logger: MemoryPhysicalQueryPlanLogger, args: ILogOperationArgs) {
    this.logger = logger;
    this.actor = args.actor;
    this.logicalOperator = args.logicalOperator;
    this.physicalOperator = args.physicalOperator;
    this.operation = args.operation;
    this.repeated = args.repeated ?? false;
    this.metadata = args.metadata ?? {};
  }

  public appendMetadata(metadata: any): void {
    this.metadata = {
      ...this.metadata,
      ...metadata,
    };
  }

  public adoptInput(node: IPhysicalQueryPlanNode): void {
    const child = <MemoryPlanNode> node;
    if (child.parent === this) {
      return;
    }
    child.detach();
    child.attachTo(this);
  }

  /**
   * Attach this node to the given parent.
   * @param parent The parent to attach to.
   */
  public attachTo(parent: MemoryPlanNode): void {
    this.parent = parent;
    parent.children.push(this);
  }

  /**
   * Detach this node from its parent, if it has one.
   */
  public detach(): void {
    if (this.parent) {
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = undefined;
    }
  }

  public setOutput(output: unknown): void {
    this.logger.registerOutput(output, this);
  }
}
