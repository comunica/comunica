import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, Factory } from 'sparqlalgebrajs';

const AF = new Factory();

/**
 * A comunica Group Sources Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationGroupSources extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    if (ActorQueryOperation.getOperationSource(action.operation)) {
      throw new Error(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    return { operation: await this.groupOperation(action.operation, action.context), context: action.context };
  }

  /**
   * Group operations belonging to the same source together, only if that source accepts the grouped operations.
   * This grouping will be done recursively for the whole operation tree.
   * Operations annotated with sources are considered leaves in the tree.
   * @param operation An operation to group.
   * @param context The action context.
   */
  public async groupOperation(operation: Algebra.Operation, context: IActionContext): Promise<Algebra.Operation> {
    // Return operation as-is if the operation already has a single source, or if the operation has no children.
    if (ActorQueryOperation.getOperationSource(operation) ?? !('input' in operation)) {
      return operation;
    }

    // If operation has a single input, move source annotation upwards if the source can handle it.
    if (!Array.isArray(operation.input)) {
      const groupedInput = await this.groupOperation(operation.input, context);
      if (groupedInput.metadata?.scopedSource) {
        const source: IQuerySourceWrapper = ActorQueryOperation.getOperationSource(groupedInput)!;
        if (ActorQueryOperation
          .doesShapeAcceptOperation(await source.source.getSelectorShape(context), operation)) {
          this.logDebug(context, `Hoist 1 source-specific operation into a single ${operation.type} operation for ${source.source.toString()}`);
          ActorQueryOperation.removeOperationSource(groupedInput);
          operation = ActorQueryOperation.assignOperationSource(operation, source);
        }
      }
      return <Algebra.Operation> { ...operation, input: groupedInput };
    }

    // If operation has multiple inputs, cluster source annotations.
    const inputs: Algebra.Operation[] = await Promise.all(operation.input
      .map(subInput => this.groupOperation(subInput, context)));
    const clusters = this.clusterOperationsWithEqualSources(inputs);

    // If we just have a single cluster, move the source annotation upwards
    if (clusters.length === 1) {
      const newInputs = clusters[0];
      const source = ActorQueryOperation.getOperationSource(clusters[0][0])!;
      return <Algebra.Operation> {
        ...await this.moveSourceAnnotationUpwardsIfPossible(operation, newInputs, source, context),
        input: newInputs,
      };
    }

    // If the number of clusters is equal to the number of original inputs, do nothing.
    if (clusters.length === inputs.length) {
      return <Algebra.Operation> { ...operation, input: inputs };
    }

    // If we have multiple clusters, created nested multi-operations
    let multiFactoryMethod: (children: Algebra.Operation[], flatten: boolean) => Algebra.Operation;
    switch (operation.type) {
      case Algebra.types.JOIN:
        multiFactoryMethod = AF.createJoin.bind(AF);
        break;
      case Algebra.types.UNION:
        multiFactoryMethod = AF.createUnion.bind(AF);
        break;
      case Algebra.types.ALT:
        multiFactoryMethod = <any> AF.createAlt.bind(AF);
        break;
      case Algebra.types.SEQ:
        multiFactoryMethod = <any> AF.createSeq.bind(AF);
        break;
      default:
        // While LeftJoin and Minus are also multi-operations,
        // these can never occur because they only have 2 inputs,
        // so these cases will always be captured by one of the 2 if-cases above
        // (clusters.length === 1 or clusters.length === input.length)

        // In all other cases, error
        throw new Error(`Unsupported operation '${operation.type}' detected while grouping sources`);
    }
    return await this.groupOperationMulti(clusters, multiFactoryMethod, context);
  }

  protected async groupOperationMulti(
    clusters: Algebra.Operation[][],
    factoryMethod: (children: Algebra.Operation[], flatten: boolean) => Algebra.Operation,
    context: IActionContext,
  ): Promise<Algebra.Operation> {
    let flatten = true;
    const nestedMerges = await Promise.all(clusters.map(async(cluster) => {
      const source = ActorQueryOperation.getOperationSource(cluster[0])!;
      const merged = await this
        .moveSourceAnnotationUpwardsIfPossible(factoryMethod(cluster, true), cluster, source, context);
      if (ActorQueryOperation.getOperationSource(merged)) {
        flatten = false;
      }
      return merged;
    }));
    return factoryMethod(nestedMerges, flatten);
  }

  /**
   * Cluster the given operations by equal source annotations.
   * @param operationsIn An array of operations to cluster.
   */
  public clusterOperationsWithEqualSources(operationsIn: Algebra.Operation[]): Algebra.Operation[][] {
    // Operations can have a source, or no source at all
    const sourceOperations: Map<IQuerySourceWrapper, Algebra.Operation[]> = new Map();
    const sourcelessOperations: Algebra.Operation[] = [];

    // Cluster by source
    for (const operation of operationsIn) {
      const source: IQuerySourceWrapper = ActorQueryOperation.getOperationSource(operation)!;
      if (source) {
        if (!sourceOperations.has(source)) {
          sourceOperations.set(source, []);
        }
        sourceOperations.get(source)!.push(operation);
      } else {
        sourcelessOperations.push(operation);
      }
    }

    // Return clusters
    const clusters: Algebra.Operation[][] = [];
    if (sourcelessOperations.length > 0) {
      clusters.push(sourcelessOperations);
    }
    for (const [ source, operations ] of sourceOperations.entries()) {
      clusters.push(operations
        .map(operation => ActorQueryOperation.assignOperationSource(operation, source)));
    }
    return clusters;
  }

  /**
   * If the given source accepts the grouped operation, annotate the grouped operation with the source,
   * and remove the source annotation from the seperate input operations.
   * Otherwise, return the grouped operation unchanged.
   * @param operation A grouped operation consisting of all given input operations.
   * @param inputs An array of operations that share the same source annotation.
   * @param source The common source.
   * @param context The action context.
   */
  public async moveSourceAnnotationUpwardsIfPossible<O extends Algebra.Operation>(
    operation: O,
    inputs: Algebra.Operation[],
    source: IQuerySourceWrapper | undefined,
    context: IActionContext,
  ): Promise<O> {
    if (source && ActorQueryOperation
      .doesShapeAcceptOperation(await source.source.getSelectorShape(context), operation)) {
      this.logDebug(context, `Hoist ${inputs.length} source-specific operations into a single ${operation.type} operation for ${source.source.toString()}`);
      operation = ActorQueryOperation.assignOperationSource(operation, source);
      for (const input of inputs) {
        ActorQueryOperation.removeOperationSource(input);
      }
    }
    return operation;
  }
}
