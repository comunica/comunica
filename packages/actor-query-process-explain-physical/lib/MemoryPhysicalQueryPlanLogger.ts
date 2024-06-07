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

    if (this.rootNode) {
      if (!parentNode) {
        throw new Error(`Detected more than one parent-less node`);
      }
      const children = this.children.get(parentNode);
      if (!children) {
        throw new Error(`Could not find parent node`);
      }
      children.push(planNode);
    } else {
      if (parentNode) {
        throw new Error(`No root node has been set yet, while a parent is being referenced`);
      }
      this.rootNode = planNode;
    }
  }

  public toJson(): any {
    return this.rootNode ? this.planNodeToJson(this.rootNode) : {};
  }

  private planNodeToJson(node: IPlanNode): IPlanNodeJson {
    const data: IPlanNodeJson = {
      logical: node.logicalOperator,
      physical: node.physicalOperator,
      ...this.getLogicalMetadata(node.rawNode),
      ...this.compactMetadata(node.metadata),
    };

    if (node.children.length > 0) {
      data.children = node.children.map(child => this.planNodeToJson(child));
    }

    // Special case: compact children for bind joins.
    if (data.physical === 'bind' && data.children) {
      // Group children by query plan format
      const childrenGrouped: Record<string, IPlanNodeJson[]> = {};
      for (const child of data.children) {
        const lastSubChild = <IPlanNodeJson> child.children?.at(-1);
        const key = this.getPlanHash(lastSubChild).join(',');
        if (!childrenGrouped[key]) {
          childrenGrouped[key] = [];
        }
        childrenGrouped[key].push(child);
      }

      // Compact query plan occurrences
      const childrenCompact: IPlanNodeJsonChildCompact[] = [];
      for (const children of Object.values(childrenGrouped)) {
        childrenCompact.push({
          occurrences: children.length,
          firstOccurrence: children[0],
        });
      }

      // Replace children with compacted representation
      data.childrenCompact = childrenCompact;
      delete data.children;
    }

    return data;
  }

  private getPlanHash(node: IPlanNodeJson): string[] {
    let entries = [ `${node.logical}-${node.physical}` ];
    if (node.children) {
      entries = [
        ...entries,
        ...node.children.flatMap(child => this.getPlanHash(child)),
      ];
    } else if (node.childrenCompact) {
      entries = [
        ...entries,
        ...node.childrenCompact.flatMap(child => this.getPlanHash(child.firstOccurrence)),
      ];
    }
    return entries;
  }

  private compactMetadata(metadata: any): any {
    return Object.fromEntries(Object.entries(metadata)
      .map(([ key, value ]) => [ key, this.compactMetadataValue(value) ]));
  }

  private compactMetadataValue(value: any): any {
    return value && typeof value === 'object' && 'termType' in value ? this.getLogicalMetadata(value) : value;
  }

  private getLogicalMetadata(rawNode: any): IPlanNodeJsonLogicalMetadata {
    const data: IPlanNodeJsonLogicalMetadata = {};

    if ('type' in rawNode) {
      const operation: Algebra.Operation = rawNode;

      if (operation.metadata?.scopedSource) {
        data.source = (<any> operation.metadata.scopedSource).source.toString();
      }

      // eslint-disable-next-line ts/switch-exhaustiveness-check
      switch (operation.type) {
        case 'pattern':
          data.pattern = this.quadToString(operation);
          break;
        case 'project':
          data.variables = operation.variables.map(variable => variable.value);
          break;
      }
    }

    return data;
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

interface IPlanNodeJson extends IPlanNodeJsonLogicalMetadata {
  logical: string;
  physical?: string;
  [metadataKey: string]: any;
  children?: IPlanNodeJson[];
  childrenCompact?: IPlanNodeJsonChildCompact[];
}

interface IPlanNodeJsonChildCompact {
  occurrences: number;
  firstOccurrence: IPlanNodeJson;
}

interface IPlanNodeJsonLogicalMetadata {
  pattern?: string;
  source?: string;
  variables?: string[];
}
