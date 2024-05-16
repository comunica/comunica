import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

const AF = new Factory();
const DF = new DataFactory();

/**
 * A comunica Prune Empty Source Operations Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationPruneEmptySourceOperations extends ActorOptimizeQueryOperation {
  private readonly useAskIfSupported: boolean;

  public constructor(args: IActorOptimizeQueryOperationPruneEmptySourceOperationsArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    if (ActorQueryOperation.getOperationSource(action.operation)) {
      throw new Error(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
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
        AF.createPattern(DF.variable('?s'), collectedOperation.iri, DF.variable('?o')) :
        collectedOperation;
      if (!await this.hasSourceResults(
        ActorQueryOperation.getOperationSource(collectedOperation)!,
        checkOperation,
        action.context,
      )) {
        emptyOperations.add(collectedOperation);
      }
    }));

    // Only perform next mapping if we have at least one empty operation
    this.logDebug(action.context, `Pruning ${emptyOperations.size} source-specific operations`);
    if (emptyOperations.size > 0) {
      // Rewrite operations by removing the empty children
      operation = Util.mapOperation(operation, {
        [Algebra.types.UNION](subOperation, factory) {
          return self.mapMultiOperation(subOperation, emptyOperations, children => factory.createUnion(children));
        },
        [Algebra.types.ALT](subOperation, factory) {
          return self.mapMultiOperation(subOperation, emptyOperations, children => factory.createAlt(children));
        },
      });

      // Identify and remove projections that have become empty now due to missing variables
      operation = Util.mapOperation(operation, {
        [Algebra.types.PROJECT](subOperation, factory) {
          let emptyProject = false;
          Util.recurseOperation(subOperation, {
            [Algebra.types.UNION](subSubOperation) {
              if (subSubOperation.input.length === 0) {
                emptyProject = true;
              }
              return true;
            },
            [Algebra.types.ALT](subSubOperation) {
              if (subSubOperation.input.length === 0) {
                emptyProject = true;
              }
              return true;
            },
          });

          if (emptyProject) {
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
      });
    }

    return { operation, context: action.context };
  }

  protected collectMultiOperationInputs(
    inputs: Algebra.Operation[],
    collectedOperations: (Algebra.Pattern | Algebra.Link)[],
    inputType: (Algebra.Pattern | Algebra.Link)['type'],
  ): void {
    for (const input of inputs) {
      if (ActorQueryOperation.getOperationSource(input) && input.type === inputType) {
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
   * @param source A query source.
   * @param input A query operation.
   * @param context The query context.
   */
  public async hasSourceResults(
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
      const askOperation = AF.createAsk(input);
      if (ActorQueryOperation
        .doesShapeAcceptOperation(await source.source.getSelectorShape(context), askOperation)) {
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
