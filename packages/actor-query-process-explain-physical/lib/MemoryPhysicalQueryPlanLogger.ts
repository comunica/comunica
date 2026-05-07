import type { IPhysicalQueryPlanLogger, IPlanNode } from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';

/**
 * A physical query plan logger that stores everything in memory.
 */
export class MemoryPhysicalQueryPlanLogger implements IPhysicalQueryPlanLogger {
  private readonly planNodes: Map<any, IPlanNode>;
  private rootNode: IPlanNode | undefined;

  /**
   * Creates a new in-memory physical query plan logger.
   */
  public constructor() {
    this.planNodes = new Map();
  }

  /**
   * Logs a query plan operation node and attaches it to the plan tree.
   * @param logicalOperator The logical operator name.
   * @param physicalOperator The physical operator name, if any.
   * @param node The raw algebra node.
   * @param parentNode The parent algebra node, or undefined for the root.
   * @param actor The name of the actor handling this operation.
   * @param metadata Additional metadata for the plan node.
   */
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
    this.planNodes.set(node, planNode);

    if (this.rootNode) {
      if (!parentNode) {
        throw new Error(`Detected more than one parent-less node`);
      }
      const planParentNode = this.planNodes.get(parentNode);
      if (!planParentNode) {
        throw new Error(`Could not find parent node`);
      }
      planParentNode.children.push(planNode);
    } else {
      if (parentNode) {
        throw new Error(`No root node has been set yet, while a parent is being referenced`);
      }
      this.rootNode = planNode;
    }
  }

  /**
   * Removes or filters children of the plan node associated with the given algebra node.
   * @param node The algebra node whose plan node children to stash.
   * @param filter An optional predicate to select which children to keep.
   */
  public stashChildren(node: any, filter?: (planNodeFilter: IPlanNode) => boolean): void {
    const planNode = this.planNodes.get(node);
    if (!planNode) {
      throw new Error(`Could not find plan node`);
    }
    planNode.children = filter ? planNode.children.filter(filter) : [];
  }

  /**
   * Re-attaches a previously stashed plan node as a child of the given parent node.
   * @param node The algebra node to unstash.
   * @param parentNode The parent algebra node to attach it to.
   */
  public unstashChild(
    node: any,
    parentNode: any,
  ): void {
    const planNode = this.planNodes.get(node);
    if (planNode) {
      const planParentNode = this.planNodes.get(parentNode);
      if (!planParentNode) {
        throw new Error(`Could not find plan parent node`);
      }
      planParentNode.children.push(planNode);
    }
  }

  /**
   * Merges additional metadata into the plan node associated with the given algebra node.
   * @param node The algebra node whose plan node metadata to update.
   * @param metadata The metadata to merge.
   */
  public appendMetadata(
    node: any,
    metadata: any,
  ): void {
    const planNode = this.planNodes.get(node);
    if (planNode) {
      planNode.metadata = {
        ...planNode.metadata,
        ...metadata,
      };
    }
  }

  /**
   * Converts the query plan tree to a JSON representation.
   * @return The root plan node as JSON, or an empty object if no plan exists.
   */
  public toJson(): IPlanNodeJson | Record<string, never> {
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
        const lastSubChild = child.children?.at(-1) ?? child;
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

      if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
        data.pattern = this.quadToString(operation);
      } else if (isKnownOperation(operation, Algebra.Types.PROJECT)) {
        data.variables = operation.variables.map(variable => variable.value);
      }
    }

    return data;
  }

  private quadToString(quad: RDF.BaseQuad): string {
    return `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)}${quad.graph.termType === 'DefaultGraph' ? '' : ` ${termToString(quad.graph)}`}`;
  }

  /**
   * Converts the query plan tree to a compact human-readable string.
   * @return A multi-line string representing the query plan.
   */
  public toCompactString(): string {
    const node = this.toJson();
    const lines: string[] = [];
    const sources: Map<string, number> = new Map();

    if ('logical' in node) {
      this.nodeToCompactString(lines, sources, '', <IPlanNodeJson> node);
    } else {
      lines.push('Empty');
    }

    if (sources.size > 0) {
      lines.push('');
      lines.push('sources:');
      for (const [ key, id ] of sources.entries()) {
        lines.push(`  ${id}: ${key}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Recursively converts a plan node and its children into compact string lines.
   * @param lines The accumulator array of output lines.
   * @param sources A map tracking source URIs to numeric identifiers.
   * @param indent The current indentation prefix.
   * @param node The plan node to render.
   * @param metadata Optional additional metadata string to append.
   */
  public nodeToCompactString(
    lines: string[],
    sources: Map<string, number>,
    indent: string,
    node: IPlanNodeJson,
    metadata?: string,
  ): void {
    let sourceId: number | undefined;
    if (node.source) {
      sourceId = sources.get(node.source);
      if (sourceId === undefined) {
        sourceId = sources.size;
        sources.set(node.source, sourceId);
      }
    }

    lines.push(`${
      indent}${
      node.logical}${
      node.physical ? `(${node.physical})` : ''}${
      node.pattern ? ` (${node.pattern})` : ''}${
      node.variables ? ` (${node.variables.join(',')})` : ''}${
      node.bindOperation ? ` bindOperation:(${node.bindOperation.pattern}) bindCardEst:${node.bindOperationCardinality.type === 'estimate' ? '~' : ''}${numberToString(node.bindOperationCardinality.value)}` : ''}${
      node.cardinality ? ` cardEst:${node.cardinality.type === 'estimate' ? '~' : ''}${numberToString(node.cardinality.value)}` : ''}${
      node.source ? ` src:${sourceId}` : ''}${
      node.cardinalityReal ? ` cardReal:${node.cardinalityReal}` : ''}${
      node.timeSelf ? ` timeSelf:${numberToString(node.timeSelf)}ms` : ''}${
      node.timeLife ? ` timeLife:${numberToString(node.timeLife)}ms` : ''}${
      metadata ? ` ${metadata}` : ''}`);
    for (const child of node.children ?? []) {
      this.nodeToCompactString(lines, sources, `${indent}  `, child);
    }
    for (const child of node.childrenCompact ?? []) {
      this.nodeToCompactString(lines, sources, `${indent}  `, child.firstOccurrence, `compacted-occurrences:${child.occurrences}`);
    }
  }
}

/**
 * Formats a number as a locale-aware string with up to three decimal places.
 * @param value The number to format.
 * @return The formatted string.
 */
export function numberToString(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
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
  cardinality?: RDF.QueryResultCardinality;
}
