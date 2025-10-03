import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/algebra-sparql-comunica';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { getDataDestinationValue } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery, KeysQueryOperation, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IDataDestination, IQuerySourceWrapper } from '@comunica/types';
import { assignOperationSource, doesShapeAcceptOperation } from '@comunica/utils-query-operation';

/**
 * A comunica Assign Sources Exhaustive Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationAssignSourcesExhaustive extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const sources: IQuerySourceWrapper[] = action.context.get(KeysQueryOperation.querySources) ?? [];
    if (sources.length === 0) {
      return { operation: action.operation, context: action.context };
    }
    if (sources.length === 1) {
      const sourceWrapper = sources[0];
      const destination: IDataDestination | undefined = action.context.get(KeysRdfUpdateQuads.destination);
      if (!destination || sourceWrapper.source.referenceValue === getDataDestinationValue(destination)) {
        try {
          const shape = await sourceWrapper.source.getSelectorShape(action.context);
          if (doesShapeAcceptOperation(shape, action.operation)) {
            return {
              operation: assignOperationSource(action.operation, sourceWrapper),
              context: action.context,
            };
          }
        } catch {
          // Fallback to the default case when the selector shape does not exist,
          // which can occur for a non-existent destination.
        }
      }
    }
    return {
      operation: this.assignExhaustive(algebraFactory, action.operation, sources),
      // We only keep queryString in the context if we only have a single source that accepts the full operation.
      // In that case, the queryString can be sent to the source as-is.
      context: action.context
        .delete(KeysInitQuery.queryString),
    };
  }

  /**
   * Assign the given sources to the leaves in the given query operation.
   * Leaves will be wrapped in a union operation and duplicated for every source.
   * The input operation will not be modified.
   * @param factory The algebra factory.
   * @param operation The input operation.
   * @param sources The sources to assign.
   */
  public assignExhaustive(
    factory: AlgebraFactory,
    operation: Algebra.Operation,
    sources: IQuerySourceWrapper[],
  ): Algebra.Operation {
    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    const transformer = new algebraUtils.AlgebraTransformer();
    return transformer.transformNodeSpecific<'unsafe', typeof operation>(
      operation,
      {
        [Algebra.Types.PATTERN]: { transform: (subOperation) => {
          if (sources.length === 1) {
            return {
              result: assignOperationSource(subOperation, sources[0]),
              recurse: false,
            };
          }
          return {
            result: factory.createUnion(sources
              .map(source => assignOperationSource(subOperation, source))),
            recurse: false,
          };
        } },
        [Algebra.Types.SERVICE]: { transform: subOperation => ({
          result: subOperation,
          recurse: false,
        }) },
        [Algebra.Types.CONSTRUCT]: { transform: subOperation => ({
          result: factory.createConstruct(
            self.assignExhaustive(factory, subOperation.input, sources),
            subOperation.template,
          ),
          recurse: false,
        }) },
      },
      {
        [Algebra.Types.PROPERTY_PATH_SYMBOL]: {
          [Algebra.PropertyPathSymbolTypes.LINK]: { transform: (subOperation) => {
            if (sources.length === 1) {
              return {
                result: assignOperationSource(subOperation, sources[0]),
                recurse: false,
              };
            }
            return {
              result: factory.createAlt(sources
                .map(source => assignOperationSource(subOperation, source))),
              recurse: false,
            };
          } },
          [Algebra.PropertyPathSymbolTypes.NPS]: { transform: (subOperation) => {
            if (sources.length === 1) {
              return {
                result: assignOperationSource(subOperation, sources[0]),
                recurse: false,
              };
            }
            return {
              result: factory.createAlt(sources
                .map(source => assignOperationSource(subOperation, source))),
              recurse: false,
            };
          } },
        },
        [Algebra.Types.UPDATE]: {
          [Algebra.UpdateTypes.DELETE_INSERT]: { transform: subOperation => ({
            result: factory.createDeleteInsert(
              subOperation.delete,
              subOperation.insert,
              subOperation.where ? self.assignExhaustive(factory, subOperation.where, sources) : undefined,
            ),
            recurse: false,
          }) },
        },
      },
    );
  }
}
