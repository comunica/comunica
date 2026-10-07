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
import { Algebra, AlgebraFactory, algebraUtils, isKnownOperation, isKnownSubType } from '@comunica/utils-algebra';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';

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
      operation = this.removeEmptyOperations(algebraFactory, operation, emptyOperations);
    }

    return { operation, context: action.context };
  }

  /**
   * Remove the given empty operations, and let the emptiness they leave behind propagate upwards.
   * Since the operations are rewritten bottom-up, each operation only has to check whether its inputs *are* empty,
   * for which an empty union (or alt within property paths) is used.
   * Emptiness only propagates through the operations that need results from their inputs,
   * so not for instance through the expressions of a FILTER, as a `NOT EXISTS` over an empty operation still holds.
   * @param algebraFactory The algebra factory.
   * @param operation The operation to remove empty operations from.
   * @param emptyOperations The operations without results.
   */
  public removeEmptyOperations(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    emptyOperations: Set<Algebra.Operation>,
  ): Algebra.Operation {
    const isEmpty = ActorOptimizeQueryOperationPruneEmptySourceOperations.isEmptyOperation;
    const emptyOperation: () => Algebra.Operation = () => algebraFactory.createUnion([]);
    const emptyPath: () => Algebra.Alt = () => algebraFactory.createAlt([]);

    const emptyIfInputIsEmpty = { transform: (subOperation: Algebra.Single) =>
      isEmpty(subOperation.input) ? emptyOperation() : subOperation };
    const emptyPathIfPathIsEmpty = { transform: (subOperation: Algebra.Inv | Algebra.OneOrMorePath) =>
      isEmpty(subOperation.path) ? emptyPath() : subOperation };
    // Only the left operation determines whether there are results, and an empty right one matches nothing
    const leftIfAnyInputIsEmpty = { transform: (subOperation: Algebra.LeftJoin | Algebra.Minus) =>
      subOperation.input.some(isEmpty) ? subOperation.input[0] : subOperation };

    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.UNION]: { transform: (subOperation, origOp) =>
        this.mapMultiOperation(subOperation, origOp, emptyOperations, children =>
          algebraFactory.createUnion(children)) },
      [Algebra.Types.ALT]: { transform: (subOperation, origOp) =>
        this.mapMultiOperation(subOperation, origOp, emptyOperations, children =>
          algebraFactory.createAlt(children)) },
      [Algebra.Types.JOIN]: { transform: subOperation =>
        subOperation.input.some(isEmpty) ? emptyOperation() : subOperation },
      [Algebra.Types.SEQ]: { transform: subOperation =>
        subOperation.input.some(isEmpty) ? emptyPath() : subOperation },
      [Algebra.Types.LEFT_JOIN]: leftIfAnyInputIsEmpty,
      [Algebra.Types.MINUS]: leftIfAnyInputIsEmpty,
      [Algebra.Types.FILTER]: emptyIfInputIsEmpty,
      [Algebra.Types.EXTEND]: emptyIfInputIsEmpty,
      [Algebra.Types.PROJECT]: emptyIfInputIsEmpty,
      [Algebra.Types.DISTINCT]: emptyIfInputIsEmpty,
      [Algebra.Types.REDUCED]: emptyIfInputIsEmpty,
      [Algebra.Types.SLICE]: emptyIfInputIsEmpty,
      [Algebra.Types.ORDER_BY]: emptyIfInputIsEmpty,
      [Algebra.Types.GRAPH]: emptyIfInputIsEmpty,
      [Algebra.Types.GROUP]: { transform: (subOperation) => {
        if (!isEmpty(subOperation.input)) {
          return subOperation;
        }
        // Without grouping keys, a group produces a single result, even without input,
        // so its empty operation is replaced by one that can be sent to a source.
        return subOperation.variables.length > 0 ?
          emptyOperation() :
            { ...subOperation, input: algebraFactory.createValues([], []) };
      } },
      [Algebra.Types.PATH]: { transform: subOperation =>
        isEmpty(subOperation.predicate) ? emptyOperation() : subOperation },
      // Unlike zero-or-more and zero-or-one paths, these have no zero-length results
      [Algebra.Types.INV]: emptyPathIfPathIsEmpty,
      [Algebra.Types.ONE_OR_MORE_PATH]: emptyPathIfPathIsEmpty,
      [Algebra.Types.EXPRESSION]: { transform: (subOperation) => {
        // Replace (NOT) EXISTS over an empty operation by its outcome,
        // so that no empty operation remains within expressions, as these may be sent to a source.
        if (isKnownSubType(subOperation, Algebra.ExpressionTypes.EXISTENCE) && isEmpty(subOperation.input)) {
          return algebraFactory.createTermExpression(algebraFactory.dataFactory.literal(
            String(subOperation.not),
            algebraFactory.dataFactory.namedNode('http://www.w3.org/2001/XMLSchema#boolean'),
          ));
        }
        return subOperation;
      } },
    });
  }

  /**
   * Check if the given operation is an empty union, or an empty alt within a property path.
   * @param operation An operation.
   */
  protected static isEmptyOperation(operation: Algebra.Operation): boolean {
    return (isKnownOperation(operation, Algebra.Types.UNION) ||
        isKnownOperation(operation, Algebra.Types.ALT)) &&
      operation.input.length === 0;
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
        !ActorOptimizeQueryOperationPruneEmptySourceOperations.isEmptyOperation(input)) {
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
