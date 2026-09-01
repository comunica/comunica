import type { ILogOperationArgs, IPhysicalQueryPlanLogger, IPhysicalQueryPlanNode } from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type { IInstrumentedIterator } from '@comunica/utils-iterator';
import { instrumentIterator } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import { scheduleTask } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A single node within a physical query plan that is held in memory.
 *
 * Nodes are created by {@link MemoryPhysicalQueryPlanLogger#logOperation} and are the only way
 * to refer to a plan node. Because a node is created per operation execution, and never derived
 * from an object that the engine also uses for something else, two executions can never collide.
 */
export class MemoryPlanNode implements IPhysicalQueryPlanNode {
  public readonly logger: MemoryPhysicalQueryPlanLogger;
  public readonly actor: string;
  public readonly logicalOperator: string;
  public readonly physicalOperator: string | undefined;
  public readonly operation: any;
  public readonly children: MemoryPlanNode[] = [];
  public parent: MemoryPlanNode | undefined;
  public metadata: any;
  /**
   * If this node was adopted as an input by its parent, rather than being executed within it.
   */
  public isInput = false;

  public constructor(logger: MemoryPhysicalQueryPlanLogger, args: ILogOperationArgs) {
    this.logger = logger;
    this.actor = args.actor;
    this.logicalOperator = args.logicalOperator;
    this.physicalOperator = args.physicalOperator;
    this.operation = args.operation;
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
    child.isInput = true;
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

/**
 * A physical query plan logger that stores everything in memory.
 */
export class MemoryPhysicalQueryPlanLogger implements IPhysicalQueryPlanLogger {
  private readonly nodesByOutput: WeakMap<any, MemoryPlanNode>;
  private readonly measurements: IInstrumentedIterator[];
  private readonly pending: Promise<void>[];
  private rootNode: MemoryPlanNode | undefined;

  public constructor() {
    this.nodesByOutput = new WeakMap();
    this.measurements = [];
    this.pending = [];
  }

  public logOperation(args: ILogOperationArgs): IPhysicalQueryPlanNode {
    const planNode = new MemoryPlanNode(this, args);

    if (args.parentNode) {
      if (!this.rootNode) {
        throw new Error(`No root node has been set yet, while a parent is being referenced`);
      }
      planNode.attachTo(<MemoryPlanNode> args.parentNode);
    } else {
      if (this.rootNode) {
        throw new Error(`Detected more than one parent-less node`);
      }
      this.rootNode = planNode;
    }

    return planNode;
  }

  public getNodeForOutput(output: unknown): IPhysicalQueryPlanNode | undefined {
    return typeof output === 'object' && output !== null ? this.nodesByOutput.get(output) : undefined;
  }

  /**
   * Associate a query operation output with the given node, and start measuring it.
   * @param output A query operation output.
   * @param node The node that produced the output.
   */
  public registerOutput(output: unknown, node: MemoryPlanNode): void {
    if (typeof output === 'object' && output !== null) {
      this.nodesByOutput.set(output, node);
      this.measureOutput(<any> output, node);
    }
  }

  /**
   * Measure how many results the given output produced and how long that took.
   * @param output A query operation output.
   * @param node The node that produced the output.
   */
  private measureOutput(output: any, node: MemoryPlanNode): void {
    const stream = output.bindingsStream ?? output.quadStream;
    if (!stream) {
      return;
    }

    const measurement = instrumentIterator(stream);
    this.measurements.push(measurement);
    this.pending.push(measurement.counters
      .then(async(counters) => {
        node.appendMetadata({
          cardinalityReal: counters.count,
          timeSelf: counters.timeSelf,
          timeLife: counters.timeLife,
          ...counters.state === 'ended' ? {} : { streamState: counters.state },
        });

        // Only ask for metadata of an output that reached its final state on its own,
        // as the metadata of an output that was never consumed may never resolve.
        if (counters.state !== 'unfinished' && node.metadata.cardinality === undefined) {
          const metadata = await output.metadata();
          node.appendMetadata({ cardinality: metadata.cardinality });
        }
      })
      // The query itself reports failures, the plan just records what it could measure
      .catch(() => {
        // Ignore
      }));
  }

  public async finalize(): Promise<void> {
    // Let every measurement that can still settle on its own do so
    await new Promise(resolve => scheduleTask(() => resolve()));
    // Outputs that were never consumed and never destroyed would otherwise never settle
    for (const measurement of this.measurements) {
      measurement.finish();
    }
    await Promise.all(this.pending);
  }

  public toJson(): IPlanNodeJson | Record<string, never> {
    return this.rootNode ? this.planNodeToJson(this.rootNode) : {};
  }

  private planNodeToJson(node: MemoryPlanNode): IPlanNodeJson {
    const data: IPlanNodeJson = {
      logical: node.logicalOperator,
      physical: node.physicalOperator,
      ...this.getLogicalMetadata(node.operation),
      ...this.compactMetadata(node.metadata),
    };

    // Inputs are adopted from elsewhere, sub-operations are executed within this node.
    // Only the latter are ever summarized, so that an input is never hidden behind a summary.
    const inputs = node.children.filter(child => child.isInput);
    const subOperations = node.children.filter(child => !child.isInput);

    // Special case: compact the repeated sub-operations of bind joins.
    if (node.physicalOperator === 'bind' && subOperations.length > 0) {
      if (inputs.length > 0) {
        data.children = inputs.map(child => this.planNodeToJson(child));
      }

      // Group children by query plan format
      const childrenGrouped: Record<string, IPlanNodeJson[]> = {};
      for (const child of subOperations.map(subOperation => this.planNodeToJson(subOperation))) {
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

      data.childrenCompact = childrenCompact;
    } else if (node.children.length > 0) {
      data.children = node.children.map(child => this.planNodeToJson(child));
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

    if (rawNode && 'type' in rawNode) {
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
      node.cardinalityReal === undefined ? '' : ` cardReal:${node.cardinalityReal}`}${
      node.timeSelf === undefined ? '' : ` timeSelf:${numberToString(node.timeSelf)}ms`}${
      node.timeLife === undefined ? '' : ` timeLife:${numberToString(node.timeLife)}ms`}${
      node.streamState ? ` ${node.streamState}` : ''}${
      metadata ? ` ${metadata}` : ''}`);
    for (const child of node.children ?? []) {
      this.nodeToCompactString(lines, sources, `${indent}  `, child);
    }
    for (const child of node.childrenCompact ?? []) {
      this.nodeToCompactString(lines, sources, `${indent}  `, child.firstOccurrence, `compacted-occurrences:${child.occurrences}`);
    }
  }
}

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
