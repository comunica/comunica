import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  MetadataVariable,
} from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getGroupOutputCardinality, getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, TransformIterator } from 'asynciterator';
import { GroupsState } from './GroupsState';

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  private readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;

  public constructor(args: IActorQueryOperationGroupArgs) {
    super(args, Algebra.Types.GROUP);
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
  }

  public async testOperation(): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * Check if the given group operation only counts all bindings of its input, without grouping.
   * @param operation A group operation.
   */
  public static isCountAll(operation: Algebra.Group): boolean {
    return operation.variables.length === 0 &&
      operation.aggregates.length === 1 &&
      operation.aggregates[0].aggregator === 'count' &&
      !operation.aggregates[0].distinct &&
      operation.aggregates[0].expression.subType === 'wildcard';
  }

  public async runOperation(operation: Algebra.Group, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);

    // Get result stream for the input query
    const { input, aggregates } = operation;
    const outputRaw = await this.mediatorQueryOperation
      .mediate({ operation: input, context: context.delete(KeysQueryOperation.limitIndicator) });
    const output = getSafeBindings(outputRaw);

    // The variables in scope are the variables on which we group, i.e. pattern.variables.
    // For 'GROUP BY ?x, ?z', this is [?x, ?z], for 'GROUP by expr(?x) as ?e' this is [?e].
    // But also in scope are the variables defined by the aggregations, since GROUP has to handle this.
    const variables: MetadataVariable[] = [
      ...operation.variables,
      ...aggregates.map(agg => agg.variable),
    ].map(variable => ({ variable, canBeUndef: false }));

    const metadataInner = await output.metadata();
    const variablesInner = metadataInner.variables.map(v => v.variable);

    // A count of all bindings of a pattern without grouping is the cardinality of the pattern, if that is exact,
    // so the pattern does not have to be consumed, as for patterns over an in-memory store.
    // This only applies to patterns, as other operations, such as joins and filters, may report an exact cardinality
    // that is not their own.
    if (ActorQueryOperationGroup.isCountAll(operation) && operation.input.type === Algebra.Types.PATTERN &&
      metadataInner.cardinality.type === 'exact') {
      output.bindingsStream.destroy();
      const count = dataFactory.literal(
        String(metadataInner.cardinality.value),
        dataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'),
      );
      return {
        type: 'bindings',
        bindingsStream: new ArrayIterator<RDF.Bindings>(
          [ bindingsFactory.bindings([[ aggregates[0].variable, count ]]) ],
          { autoStart: false },
        ),
        metadata: async() => ({
          ...metadataInner,
          cardinality: { type: 'exact', value: 1 },
          variables,
          termOrder: undefined,
          canSeek: undefined,
        }),
      };
    }

    // Wrap a new promise inside an iterator that completes when the stream has ended or when an error occurs
    const bindingsStream = new TransformIterator(() => new Promise<BindingsStream>((resolve, reject) => {
      const groups = new GroupsState(
        operation,
        this.mediatorBindingsAggregatorFactory,
        context,
        bindingsFactory,
        variablesInner,
      );

      // Phase 2: Collect aggregator results
      // We can only return when the binding stream ends, when that happens
      // we return the identified groups. Which are nothing more than Bindings
      // of the grouping variables merged with the aggregate variables
      // eslint-disable-next-line ts/no-misused-promises
      output.bindingsStream.on('end', async() => {
        try {
          const bindingsStreamInner = new ArrayIterator(await groups.collectResults(), { autoStart: false });
          resolve(bindingsStreamInner);
        } catch (error: unknown) {
          reject(error);
        }
      });

      // Make sure to propagate any errors in the binding stream
      output.bindingsStream.on('error', reject);

      // Phase 1: Consume the stream, identify the groups and populate the aggregators.
      // We need to bind this after the 'error' and 'end' listeners to avoid the
      // stream having ended before those listeners are bound.
      output.bindingsStream.on('data', (bindings) => {
        groups.consumeBindings(bindings).catch(reject);
      });
    }), { autoStart: false });

    return {
      type: 'bindings',
      bindingsStream,
      // Groups are not emitted in the term order of the input, and aggregates may reuse its variable names
      metadata: async() => {
        const inputMetadata = await output.metadata();
        return {
          ...inputMetadata,
          cardinality: getGroupOutputCardinality(operation, inputMetadata.cardinality),
          variables,
          termOrder: undefined,
          canSeek: undefined,
        };
      },
    };
  }
}

export interface IActorQueryOperationGroupArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
}
