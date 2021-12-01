import type { IPhysicalQueryPlanLogger } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A physical query plan logger that stores everything in memory.
 */
export class MemoryPhysicalQueryPlanLogger implements IPhysicalQueryPlanLogger {
  private readonly children: Map<any, IPlanNode[]>;
  private rootNode: IPlanNode | undefined;

  public constructor() {
    this.children = new Map();
  }

  public logOperation(
    logicalOperator: string,
    physicalOperator: string | undefined,
    node: any,
    parentNode: any,
    actor: string,
    metadata: any,
  ): void {
    const planNode: IPlanNode = {
      actor,
      logicalOperator,
      physicalOperator,
      rawNode: node,
      children: [],
      metadata,
    };
    this.children.set(node, planNode.children);

    if (!this.rootNode) {
      if (parentNode) {
        throw new Error(`No root node has been set yet, while a parent is being referenced`);
      }
      this.rootNode = planNode;
    } else {
      if (!parentNode) {
        throw new Error(`Detected more than one parent-less node`);
      }
      const children = this.children.get(parentNode);
      if (!children) {
        throw new Error(`Could not find parent node`);
      }
      children.push(planNode);
    }
  }

  public toJson(): any {
    return this.rootNode ? this.planNodeToJson(this.rootNode) : {};
  }

  private planNodeToJson(node: IPlanNode): any {
    return {
      logical: node.logicalOperator,
      physical: node.physicalOperator,
      ...this.getLogicalMetadata(node.rawNode),
      ...node.metadata,
      ...node.children.length > 0 ? { children: node.children.map(child => this.planNodeToJson(child)) } : {},
    };
  }

  private getLogicalMetadata(rawNode: any): any {
    if ('type' in rawNode) {
      const operation: Algebra.Operation = rawNode;
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (operation.type) {
        case 'pattern':
          return {
            pattern: this.quadToString(operation),
          };
        case 'project':
          return {
            variables: operation.variables.map(variable => variable.value),
          };
      }
    }
    return {};
  }

  private quadToString(quad: RDF.BaseQuad): string {
    return `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)}${quad.graph.termType === 'DefaultGraph' ? '' : ` ${termToString(quad.graph)}`}`;
  }
}

interface IPlanNode {
  actor: string;
  logicalOperator: string;
  physicalOperator?: string;
  rawNode: any;
  children: IPlanNode[];
  metadata: any;
}
