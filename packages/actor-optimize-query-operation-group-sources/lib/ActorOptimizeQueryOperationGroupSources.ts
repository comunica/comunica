import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, FragmentSelectorShape, IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownOperation, isKnownSubType } from '@comunica/utils-algebra';
import {
  assignOperationSource,
  doesShapeAcceptOperation,
  getOperationSource,
  removeOperationSource,
} from '@comunica/utils-query-operation';

/**
 * A comunica Group Sources Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationGroupSources extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (getOperationSource(action.operation)) {
      return failTest(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return passTestVoid();
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
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Return operation as-is if the operation already has a single source, or if the operation has no children.
    if (getOperationSource(operation) ?? !('input' in operation)) {
      return operation;
    }

    // If operation has a single input, move source annotation upwards if the source can handle it.
    if (!Array.isArray(operation.input)) {
      const groupedInput = await this.groupOperation(<Algebra.Operation> operation.input, context);
      if (groupedInput.metadata?.scopedSource) {
        const source: IQuerySourceWrapper = <IQuerySourceWrapper> getOperationSource(groupedInput);
        operation = await this.moveSourceAnnotationUpwardsIfPossible(operation, [ groupedInput ], source, context);
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
      const source = getOperationSource(clusters[0][0])!;
      return <Algebra.Operation> {
        ...await this.moveSourceAnnotationUpwardsIfPossible(operation, newInputs, source, context),
        input: newInputs,
      };
    }

    // If the number of clusters is equal to the number of original inputs, do nothing.
    if (clusters.length === inputs.length) {
      const result: Algebra.Multi = { ...operation, input: inputs };
      return result;
    }

    // If we have multiple clusters, created nested multi-operations
    let multiFactoryMethod: (children: Algebra.Operation[], flatten: boolean) => Algebra.Operation;
    if (isKnownOperation(operation, Algebra.Types.JOIN)) {
      multiFactoryMethod = algebraFactory.createJoin.bind(algebraFactory);
    } else if (isKnownOperation(operation, Algebra.Types.UNION)) {
      multiFactoryMethod = algebraFactory.createUnion.bind(algebraFactory);
    } else if (isKnownOperation(operation, Algebra.Types.ALT)) {
      multiFactoryMethod = <any> algebraFactory.createAlt.bind(algebraFactory);
    } else if (isKnownOperation(operation, Algebra.Types.SEQ)) {
      multiFactoryMethod = <any> algebraFactory.createSeq.bind(algebraFactory);
    } else {
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
      const source = getOperationSource(cluster[0])!;
      const merged = await this
        .moveSourceAnnotationUpwardsIfPossible(factoryMethod(cluster, true), cluster, source, context);
      if (getOperationSource(merged)) {
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
      const source = getOperationSource(operation);
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
        .map(operation => assignOperationSource(operation, source)));
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
    if (source && this.isPossibleToMoveSourceAnnotationUpwards(
      operation,
      await source.source.getSelectorShape(context),
      context,
    )) {
      this.logDebug(context, `Hoist ${inputs.length} source-specific operations into a single ${operation.type} operation for ${source.source.toString()}`);
      operation = assignOperationSource(operation, source);
      for (const input of inputs) {
        removeOperationSource(input);
      }
    }
    return operation;
  }

  /**
   * Checks if it's possible to move the source annotation upwards using the following rules:
   * - If the shape doesn't accept the operation, then it's not possible.
   * - If it does and the operation does not contain extension functions or
   *   comunica doesn't support them, then it's possible.
   * - If comunica does support them, then it's possible only if the shape accepts the extension function expressions.
   * @param operation A grouped operation consisting of all given input operations.
   * @param shape The common source's shape.
   * @param context The action context.
   */
  public isPossibleToMoveSourceAnnotationUpwards<O extends Algebra.Operation>(
    operation: O,
    shape: FragmentSelectorShape,
    context: IActionContext,
  ): boolean {
    const wildcardAcceptAllExtensionFunctions = context.get(KeysInitQuery.extensionFunctionsAlwaysPushdown);
    if (doesShapeAcceptOperation(shape, operation, { wildcardAcceptAllExtensionFunctions })) {
      const extensionFunctions = context.get(KeysInitQuery.extensionFunctions);
      const expression: Algebra.Expression | undefined = (<any> operation).expression;
      return !extensionFunctions ||
        !(expression && isKnownSubType(expression, Algebra.ExpressionTypes.NAMED)) ||
        !(expression?.name.value in extensionFunctions) ||
        doesShapeAcceptOperation(shape, expression, { wildcardAcceptAllExtensionFunctions });
    }
    return false;
  }
}
