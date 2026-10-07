import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  ComunicaDataFactory,
  IActionContext,
  IQuerySourceWrapper,
  MetadataBindings,
  QueryResultCardinality,
} from '@comunica/types';
import {
  Algebra,
  AlgebraFactory,
  algebraTransformer,
  algebraUtils,
  isKnownOperation,
  isKnownSubType,
} from '@comunica/utils-algebra';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';

/**
 * Transformer that only descends into an operation if its callbacks ask for it.
 */
const nonDescendingTransformer = algebraTransformer({ continue: false });

/**
 * A comunica Prune Empty Source Operations Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationPruneEmptySourceOperations extends ActorOptimizeQueryOperation {
  private readonly useAskIfSupported: boolean;

  public constructor(args: IActorOptimizeQueryOperationPruneEmptySourceOperationsArgs) {
    super(args);
    this.useAskIfSupported = args.useAskIfSupported;
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (getOperationSource(action.operation)) {
      return failTest(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    let operation = action.operation;

    // Collect all operations with source types
    // Only consider unions of patterns or alts of links, since these are created during exhaustive source assignment.
    const collectedOperations: (Algebra.Pattern | Algebra.Link)[] = [];
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.UNION]: { preVisitor: (subOperation) => {
        this.collectMultiOperationInputs(subOperation.input, collectedOperations, Algebra.Types.PATTERN);
        return {};
      } },
      [Algebra.Types.ALT]: { preVisitor: (subOperation) => {
        this.collectMultiOperationInputs(subOperation.input, collectedOperations, Algebra.Types.LINK);
        return { continue: false };
      } },
      [Algebra.Types.SERVICE]: { preVisitor: () => ({ continue: false }) },
      // The zero-length results of these paths range over all nodes of the sources of their links,
      // so these links must be kept, even if they have no results themselves.
      [Algebra.Types.ZERO_OR_MORE_PATH]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.ZERO_OR_ONE_PATH]: { preVisitor: () => ({ continue: false }) },
      // Operations within FROM (NAMED) are evaluated over a different dataset than the source's default dataset.
      // Their graphs are only rewritten when the FROM operation is executed,
      // so emptiness checks against the source would be done on the wrong graphs here.
      [Algebra.Types.FROM]: { preVisitor: () => ({ continue: false }) },
    });

    // Determine in an async manner whether or not these sources return non-empty results
    const emptyOperations: Set<Algebra.Operation> = new Set();
    await Promise.all(collectedOperations.map(async(collectedOperation) => {
      const checkOperation = collectedOperation.type === Algebra.Types.LINK ?
        algebraFactory.createPattern(dataFactory.variable('s'), collectedOperation.iri, dataFactory.variable('o')) :
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
      operation = algebraUtils.mapOperation(operation, {
        [Algebra.Types.UNION]: { transform: (subOperation, origOp) =>
          this.mapMultiOperation(subOperation, origOp, emptyOperations, children =>
            algebraFactory.createUnion(children)) },
        [Algebra.Types.ALT]: { transform: (subOperation, origOp) =>
          this.mapMultiOperation(subOperation, origOp, emptyOperations, children =>
            algebraFactory.createAlt(children)) },

        // Remove operations that have become empty now due to missing variables
        [Algebra.Types.PROJECT]: {
          transform: (subOperation) => {
            // Remove projections that have become empty now due to missing variables
            if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation)) {
              return algebraFactory.createUnion([]);
            }
            return subOperation;
          },
        },
        [Algebra.Types.LEFT_JOIN]: { transform: (subOperation) => {
          // Remove left joins with empty right operation
          if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input[1])) {
            return subOperation.input[0];
          }
          return subOperation;
        } },
        [Algebra.Types.GROUP]: { transform: (subOperation) => {
          // Groups without keys produce a result over empty operations as well,
          // so replace their empty operation by one that can be sent to a source.
          if (subOperation.variables.length === 0 &&
            ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input)) {
            return { ...subOperation, input: algebraFactory.createValues([], []) };
          }
          return subOperation;
        } },
        [Algebra.Types.MINUS]: { transform: (subOperation) => {
          // Remove minus operations with empty right operation
          if (ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input[1])) {
            return subOperation.input[0];
          }
          return subOperation;
        } },
        [Algebra.Types.EXPRESSION]: { transform: (subOperation) => {
          // Replace (NOT) EXISTS over an empty operation by its outcome,
          // so that no empty operation remains within expressions, as these may be sent to a source.
          if (isKnownSubType(subOperation, Algebra.ExpressionTypes.EXISTENCE) &&
            ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(subOperation.input)) {
            return algebraFactory.createTermExpression(dataFactory.literal(
              String(subOperation.not),
              dataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean'),
            ));
          }
          return subOperation;
        } },
      });
    }

    return { operation, context: action.context };
  }

  /**
   * Check if the given operation produces no results, because it needs results from a union or alt
   * of which all children have been pruned.
   * Only the inputs that determine whether there are results are considered,
   * so not for instance the expressions of a FILTER, as a `NOT EXISTS` over an empty operation still holds.
   * @param operation An operation.
   */
  protected static hasEmptyOperation(operation: Algebra.Operation): boolean {
    const hasEmptyOperation = ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation;
    let emptyOperation = false;
    const emptyIf = (empty: boolean): { shortcut: boolean } | { continue: boolean } => {
      if (empty) {
        emptyOperation = true;
        return { shortcut: true };
      }
      return { continue: false };
    };
    const descend = { preVisitor: () => ({ continue: true }) };
    // Operations without callback are not descended into, so they are never considered empty
    nonDescendingTransformer.visitNode(operation, {
      // `Array.every` on an empty array always returns true
      [Algebra.Types.UNION]: { preVisitor: unionOp => emptyIf(unionOp.input.every(hasEmptyOperation)) },
      [Algebra.Types.ALT]: { preVisitor: altOp => emptyIf(altOp.input.every(hasEmptyOperation)) },
      [Algebra.Types.JOIN]: descend,
      [Algebra.Types.SEQ]: descend,
      // Only the left operation determines whether there are results
      [Algebra.Types.LEFT_JOIN]: { preVisitor: leftJoinOp => emptyIf(hasEmptyOperation(leftJoinOp.input[0])) },
      [Algebra.Types.MINUS]: { preVisitor: minusOp => emptyIf(hasEmptyOperation(minusOp.input[0])) },
      // Their expressions are not descended into, as a `NOT EXISTS` over an empty operation still holds
      [Algebra.Types.FILTER]: descend,
      [Algebra.Types.EXTEND]: descend,
      [Algebra.Types.PROJECT]: descend,
      [Algebra.Types.DISTINCT]: descend,
      [Algebra.Types.REDUCED]: descend,
      [Algebra.Types.SLICE]: descend,
      [Algebra.Types.ORDER_BY]: descend,
      [Algebra.Types.GRAPH]: descend,
      // Without grouping keys, a group produces a single result, even without input
      [Algebra.Types.GROUP]: { preVisitor: groupOp => ({ continue: groupOp.variables.length > 0 }) },
      // Unlike zero-or-more and zero-or-one paths, these have no zero-length results
      [Algebra.Types.PATH]: descend,
      [Algebra.Types.INV]: descend,
      [Algebra.Types.ONE_OR_MORE_PATH]: descend,
    });
    return emptyOperation;
  }

  protected collectMultiOperationInputs(
    inputs: Algebra.Operation[],
    collectedOperations: (Algebra.Pattern | Algebra.Link)[],
    inputType: (Algebra.Pattern | Algebra.Link)['type'],
  ): void {
    for (const input of inputs) {
      if (getOperationSource(input) && isKnownOperation(input, inputType)) {
        collectedOperations.push(input);
      }
    }
  }

  protected mapMultiOperation<O extends Algebra.Union | Algebra.Alt>(
    operationCopy: O,
    origOp: O,
    emptyOperations: Set<Algebra.Operation>,
    multiOperationFactory: (input: O['input']) => Algebra.Operation,
  ): Algebra.Operation {
    // Determine which operations return non-empty results,
    // also removing children that have become empty themselves, as these can not be sent to a source.
    const nonEmptyInputs: Algebra.Operation[] = [];
    for (const [ idx, input ] of operationCopy.input.entries()) {
      if (!emptyOperations.has(origOp.input[idx]) &&
        !ActorOptimizeQueryOperationPruneEmptySourceOperations.hasEmptyOperation(input)) {
        nonEmptyInputs.push(input);
      }
    }

    // Remove empty operations
    if (nonEmptyInputs.length === operationCopy.input.length) {
      return operationCopy;
    }
    if (nonEmptyInputs.length === 0) {
      return multiOperationFactory([]);
    }
    if (nonEmptyInputs.length === 1) {
      return nonEmptyInputs[0];
    }
    return multiOperationFactory(nonEmptyInputs);
  }

  /**
   * Check if the given query operation will produce at least one result in the given source.
   * @param algebraFactory The algebra factory.
   * @param source A query source.
   * @param input A query operation.
   * @param context The query context.
   */
  public async hasSourceResults(
    algebraFactory: AlgebraFactory,
    source: IQuerySourceWrapper,
    input: Algebra.Operation,
    context: IActionContext,
  ): Promise<boolean> {
    const mergedContext = source.context ? context.merge(source.context) : context;
    const wildcardAcceptAllExtensionFunctions = mergedContext.get(KeysInitQuery.extensionFunctionsAlwaysPushdown);

    // Traversal contexts should never be considered empty at optimization time.
    if (mergedContext.get(KeysQuerySourceIdentify.traverse)) {
      return true;
    }

    // The target of a SERVICE SILENT clause must never be pruned:
    // if it fails, it must produce a single empty solution rather than no results at all.
    if (mergedContext.get(KeysQueryOperation.silent)) {
      return true;
    }

    // Prefer ASK over COUNT when instructed to, and the source allows it
    if (this.useAskIfSupported) {
      const askOperation = algebraFactory.createAsk(input);
      const askSupported = doesShapeAcceptOperation(
        await source.source.getSelectorShape(context),
        askOperation,
        { wildcardAcceptAllExtensionFunctions },
      );
      if (askSupported) {
        return source.source.queryBoolean(askOperation, mergedContext);
      }
    }

    // Fall back to sending the full operation, and extracting the cardinality from metadata
    const bindingsStream = source.source.queryBindings(input, mergedContext);
    const cardinality = await new Promise<QueryResultCardinality>((resolve, reject) => {
      bindingsStream.on('error', reject);
      bindingsStream.getProperty('metadata', (metadata: MetadataBindings) => {
        bindingsStream.destroy();
        resolve(metadata.cardinality);
      });
    });

    // If the cardinality is an estimate, such as from a VoID description,
    // verify it using ASK if the source supports it.
    // Since the VoID estimators in Comunica cannot produce false negatives, only positive assignments must be verified.
    if (cardinality.type === 'estimate' && cardinality.value > 0) {
      const askOperation = algebraFactory.createAsk(input);
      const askSupported = doesShapeAcceptOperation(
        await source.source.getSelectorShape(context),
        askOperation,
        { wildcardAcceptAllExtensionFunctions },
      );
      if (askSupported) {
        return source.source.queryBoolean(askOperation, mergedContext);
      }
    }

    return cardinality.value > 0;
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
