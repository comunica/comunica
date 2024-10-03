import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

/**
 * A comunica Prune Empty Source Operations Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationPruneEmptySourceOperations extends ActorOptimizeQueryOperation {
  private readonly useAskIfSupported: boolean;

  public constructor(args: IActorOptimizeQueryOperationPruneEmptySourceOperationsArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (getOperationSource(action.operation)) {
      return failTest(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    let operation = action.operation;

    // Collect all operations with source types
    // Only consider unions of patterns or alts of links, since these are created during exhaustive source assignment.
    const collectedOperations: (Algebra.Pattern | Algebra.Link)[] = [];
    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    Util.recurseOperation(operation, {
      [Algebra.types.UNION](subOperation) {
        self.collectMultiOperationInputs(subOperation.input, collectedOperations, Algebra.types.PATTERN);
        return true;
      },
      [Algebra.types.ALT](subOperation) {
        self.collectMultiOperationInputs(subOperation.input, collectedOperations, Algebra.types.LINK);
        return false;
      },
      [Algebra.types.SERVICE]() {
        return false;
      },
    });

    // Determine in an async manner whether or not these sources return non-empty results
    const emptyOperations: Set<Algebra.Operation> = new Set();
    await Promise.all(collectedOperations.map(async(collectedOperation) => {
      const checkOperation = collectedOperation.type === 'link' ?
        algebraFactory.createPattern(dataFactory.variable('?s'), collectedOperation.iri, dataFactory.variable('?o')) :
        collectedOperation;
      if (!await this.hasSourceResults(
        algebraFactory,
        getOperationSource(collectedOperation)!,
        checkOperation,
        action.context,
      )) {
        emptyOperations.add(collectedOperation);
      }
    }));

    // Only perform next mapping if we have at least one empty operation
    if (emptyOperations.size > 0) {
      this.logDebug(action.context, `Pruning ${emptyOperations.size} source-specific operations`);
      // Rewrite operations by removing the empty children
      operation = Util.mapOperation(operation, {
        [Algebra.types.UNION](subOperation, factory) {
          return self.mapMultiOperation(subOperation, emptyOperations, children => factory.createUnion(children));
        },
        [Algebra.types.ALT](subOperation, factory) {
          return self.mapMultiOperation(subOperation, emptyOperations, children => factory.createAlt(children));
        },
      }, algebraFactory);

      // Identify and remove operations that have become empty now due to missing variables
      operation = Util.mapOperation(operation, {
        [Algebra.types.PROJECT](subOperation, factory) {
          // Remove projections that have become empty now due to missing variables
          if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation)) {
            return {
              recurse: false,
              result: factory.createUnion([]),
            };
          }
          return {
            recurse: true,
            result: subOperation,
          };
        },
        [Algebra.types.LEFT_JOIN](subOperation) {
          // Remove left joins with empty right operation
          if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input[1])) {
            return {
              recurse: true,
              result: subOperation.input[0],
            };
          }
          return {
            recurse: true,
            result: subOperation,
          };
        },
      }, algebraFactory);
    }

    return { operation, context: action.context };
  }

  protected static hasEmptyOperation(operation: Algebra.Operation): boolean {
    // If union (or alt) is empty, consider it empty (`Array.every` on an empty array always returns true)
    // But if we find a union with multiple children,
    // *all* of the children must be empty before the full operation is considered empty.
    let emptyOperation = false;
    Util.recurseOperation(operation, {
      [Algebra.types.UNION](subOperation) {
        if (subOperation.input.every(subSubOperation => ActorOptimizeQueryOperationPruneEmptySourceOperations
          .hasEmptyOperation(subSubOperation))) {
          emptyOperation = true;
        }
        return false;
      },
      [Algebra.types.ALT](subOperation) {
        if (subOperation.input.length === 0) {
          emptyOperation = true;
        }
        return false;
      },
      [Algebra.types.LEFT_JOIN](subOperation) {
        // Only recurse into left part of left-join
        if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input[0])) {
          emptyOperation = true;
        }
        return false;
      },
    });
    return emptyOperation;
  }

  protected collectMultiOperationInputs(
    inputs: Algebra.Operation[],
    collectedOperations: (Algebra.Pattern | Algebra.Link)[],
    inputType: (Algebra.Pattern | Algebra.Link)['type'],
  ): void {
    for (const input of inputs) {
      if (getOperationSource(input) && input.type === inputType) {
        collectedOperations.push(input);
      }
    }
  }

  protected mapMultiOperation<O extends Algebra.Union | Algebra.Alt>(
    operation: O,
    emptyOperations: Set<Algebra.Operation>,
    multiOperationFactory: (input: O['input']) => Algebra.Operation,
  ): {
      result: Algebra.Operation;
      recurse: boolean;
    } {
    // Determine which operations return non-empty results
    const nonEmptyInputs = operation.input.filter(input => !emptyOperations.has(input));

    // Remove empty operations
    if (nonEmptyInputs.length === operation.input.length) {
      return { result: operation, recurse: true };
    }
    if (nonEmptyInputs.length === 0) {
      return { result: multiOperationFactory([]), recurse: false };
    }
    if (nonEmptyInputs.length === 1) {
      return { result: nonEmptyInputs[0], recurse: true };
    }
    return { result: multiOperationFactory(nonEmptyInputs), recurse: true };
  }

  /**
   * Check if the given query operation will produce at least one result in the given source.
   * @param algebraFactory The algebra factory.
   * @param source A query source.
   * @param input A query operation.
   * @param context The query context.
   */
  public async hasSourceResults(
    algebraFactory: Factory,
    source: IQuerySourceWrapper,
    input: Algebra.Operation,
    context: IActionContext,
  ): Promise<boolean> {
    // Traversal sources should never be considered empty at optimization time.
    if (source.context?.get(KeysQuerySourceIdentify.traverse)) {
      return true;
    }

    // Send an ASK query
    if (this.useAskIfSupported) {
      const askOperation = algebraFactory.createAsk(input);
      if (doesShapeAcceptOperation(await source.source.getSelectorShape(context), askOperation)) {
        return source.source.queryBoolean(askOperation, context);
      }
    }

    // Send the operation as-is and check the response cardinality
    const bindingsStream = source.source.queryBindings(input, context);
    return new Promise((resolve, reject) => {
      bindingsStream.on('error', reject);
      bindingsStream.getProperty('metadata', (metadata: MetadataBindings) => {
        bindingsStream.destroy();
        resolve(metadata.cardinality.value > 0);
      });
    });
  }
}

export interface IActorOptimizeQueryOperationPruneEmptySourceOperationsArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * If true, ASK queries will be sent to the source instead of COUNT queries to check emptiness for patterns.
   * This will only be done for sources that accept ASK queries.
   * @default {false}
   */
  useAskIfSupported: boolean;
}
