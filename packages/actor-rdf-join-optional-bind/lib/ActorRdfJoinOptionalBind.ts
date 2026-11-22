import type { BindOrder } from '@comunica/actor-rdf-join-inner-multi-bind';
import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, ComunicaDataFactory, IQuerySource } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, algebraUtils, inScopeVariables } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource, getSafeBindings, groupRepeatedSubOperations } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, TransformIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Optional Bind RDF Join Actor.
 */
export class ActorRdfJoinOptionalBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinOptionalBindArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'bind',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
      canHandleOperationRequired: true,
      canHandleExpression: true,
    });
    this.bindOrder = args.bindOrder;
    this.selectivityModifier = args.selectivityModifier;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const bindingsFactory = await BindingsFactory.create(
      this.mediatorMergeBindingsContext,
      action.context,
      dataFactory,
    );
    // Close the right stream, since we don't need that one
    action.entries[1].output.bindingsStream.close();

    // A right side over multiple sources is joined with all left bindings at once,
    // so that the join can pass blocks of bindings to each source, instead of one request per binding and source.
    if (!action.expression && ActorRdfJoinOptionalBind.getOperationSources(action.entries[1].operation).size >= 2) {
      return {
        result: {
          type: 'bindings',
          bindingsStream: this.createInnerJoinOptionalStream(action, algebraFactory),
          metadata: async() => await this.constructResultMetadata(
            action.entries,
            await ActorRdfJoin.getMetadatas(action.entries),
            action.context,
            {},
            true,
          ),
        },
        physicalPlanMetadata: {
          bindOrder: 'inner-join',
        },
      };
    }

    // Bind the right pattern for each binding in the stream
    const leftMetadata = await action.entries[0].output.metadata();
    const subContext = groupRepeatedSubOperations(action.context, 'bindings', this.name)
      .set(KeysQueryOperation.joinLeftMetadata, leftMetadata)
      .set(KeysQueryOperation.joinRightMetadatas, [ await action.entries[1].output.metadata() ]);
    const bindingsStream: BindingsStream = ActorRdfJoinMultiBind.createBindStream(
      this.bindOrder,
      action.entries[0].output.bindingsStream,
      [ ActorRdfJoinOptionalBind.getBindOperation(action) ],
      async(operations: Algebra.Operation[], operationBindings: Bindings) => {
        // Send the materialized patterns to the mediator for recursive join evaluation.
        // Length of operations will always be 1
        const operation = operations[0];
        const output = getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
      true,
      algebraFactory,
      bindingsFactory,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          {},
          true,
        ),
      },
      physicalPlanMetadata: {
        bindOrder: this.bindOrder,
      },
    };
  }

  /**
   * Evaluate the optional join as an inner join of all left bindings with the right operation,
   * followed by the left bindings that no result matches.
   * @param action The join action.
   * @param algebraFactory The algebra factory.
   */
  public createInnerJoinOptionalStream(action: IActionRdfJoin, algebraFactory: AlgebraFactory): BindingsStream {
    return new TransformIterator<Bindings>(async() => {
      const left: Bindings[] = await action.entries[0].output.bindingsStream.toArray();
      if (left.length === 0) {
        return new ArrayIterator<Bindings>([], { autoStart: false });
      }

      // Left bindings may bind different sets of variables, so they are matched per set of variables.
      const signatures = new Map<string, RDF.Variable[]>();
      const variables = new Map<string, RDF.Variable>();
      for (const binding of left) {
        const bindingVariables = [ ...binding.keys() ].sort((a, b) => a.value.localeCompare(b.value));
        signatures.set(bindingVariables.map(variable => variable.value).join(' '), bindingVariables);
        for (const variable of bindingVariables) {
          variables.set(variable.value, variable);
        }
      }
      const keyOf = (signature: string, binding: Bindings): string | undefined => {
        const terms = signatures.get(signature)!.map(variable => binding.get(variable));
        if (terms.every(Boolean)) {
          return `${signature}|${terms.map(term => termToString(term)).join(' ')}`;
        }
      };

      const values = algebraFactory.createValues(
        [ ...variables.values() ],
        left.map(binding => Object.fromEntries([ ...binding ]
          .map(([ variable, term ]) => [ variable.value, <RDF.NamedNode | RDF.Literal> term ]))),
      );
      const output = getSafeBindings(await this.mediatorQueryOperation.mediate({
        operation: algebraFactory.createJoin([ values, action.entries[1].operation ]),
        context: action.context,
      }));

      const matched = new Set<string>();
      const results = output.bindingsStream.map((result) => {
        for (const signature of signatures.keys()) {
          const key = keyOf(signature, result);
          if (key) {
            matched.add(key);
          }
        }
        return result;
      });
      const unmatched = new TransformIterator<Bindings>(async() => new ArrayIterator(left.filter((binding) => {
        const signature = [ ...binding.keys() ].map(variable => variable.value)
          .sort((a, b) => a.localeCompare(b)).join(' ');
        return !matched.has(keyOf(signature, binding)!);
      }), { autoStart: false }), { autoStart: false });
      return results.append(unmatched);
    }, { autoStart: false });
  }

  /**
   * The operation to bind left bindings into: the right operation, filtered by the join expression if there is one.
   * @param action The join action.
   */
  public static getBindOperation(action: IActionRdfJoin): Algebra.Operation {
    if (!action.expression) {
      return action.entries[1].operation;
    }
    const algebraFactory = new AlgebraFactory(action.context.getSafe(KeysInitQuery.dataFactory));
    const filterOperation = algebraUtils
      .withMetadata(algebraFactory.createFilter(action.entries[1].operation, action.expression));
    filterOperation.metadata.isHoistedLeftJoinFilter = true;
    return filterOperation;
  }

  /**
   * Determine the sources that the operations within the given operation are assigned to.
   * @param operation An operation.
   */
  public static getOperationSources(operation: Algebra.Operation): Set<IQuerySource> {
    const sources = new Set<IQuerySource>();
    const visit = (subOperation: Algebra.Operation): void => {
      const source = getOperationSource(subOperation);
      if (source) {
        sources.add(source.source);
      } else {
        for (const child of algebraUtils.getSubOperations(subOperation)) {
          visit(child);
        }
      }
    };
    visit(operation);
    return sources;
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;

    // Without cardinalities, all optional joins have the same cost, and this one comes first on the bus.
    // Binding pays off when the right side spans multiple sources, as evaluating it as a whole would download from
    // each of them, while other right sides, e.g., over a single local source, are evaluated as a whole more cheaply.
    // Entries that require their operation can only be bound, so this does not apply to them.
    if (!action.entries.some((entry, index) => ActorRdfJoin.isOperationRequired(entry, metadatas[index])) &&
      metadatas.some(metadata => !Number.isFinite(metadata.cardinality.value)) &&
      ActorRdfJoinOptionalBind.getOperationSources(action.entries[1].operation).size < 2) {
      return failTest(`Actor ${this.name} can only bind on a right side with an unknown cardinality if it spans multiple sources`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Reject binding on some operation types (including when reachable through e.g. a Project or Filter wrapper)
    const boundVariables = inScopeVariables(action.entries[0].operation);
    const bindOperation = ActorRdfJoinOptionalBind.getBindOperation(action);
    if (!ActorRdfJoinMultiBind.canBindWithOperation(bindOperation, boundVariables)) {
      return failTest(`Actor ${this.name} can not bind on Extend, Group, or conflicting LeftJoin/Minus operations`);
    }

    // Determine selectivity of join
    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;

    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value * selectivity,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality.value * (
          requestItemTimes[0] +
          requestInitialTimes[1] +
          selectivity * metadatas[1].cardinality.value * requestItemTimes[1]
        ),
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalBindArgs extends IActorRdfJoinArgs {
  /**
   * The order in which elements should be bound
   * @default {depth-first}
   */
  bindOrder: BindOrder;
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.000001}
   */
  selectivityModifier: number;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;

}
