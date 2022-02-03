import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IQueryOperationResultBindings, IQueryOperationResult,
  IActionContext, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { UnionIterator } from 'asynciterator';
import { uniqTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Alt Query Operation Actor.
 */
export class ActorQueryOperationPathAlt extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ALT);
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the cardinality metadata value is properly calculated.
   * @param {IMetadata[]} metadatas Array of metadata.
   * @return {IMetadata} Union of the metadata.
   */
  public static unionMetadata(metadatas: MetadataBindings[]): MetadataBindings {
    const cardinality: RDF.QueryResultCardinality = { type: 'exact', value: 0 };
    for (const metadata of metadatas) {
      if ((metadata.cardinality.value && Number.isFinite(metadata.cardinality.value)) ||
        metadata.cardinality.value === 0) {
        if (metadata.cardinality.type === 'estimate') {
          cardinality.type = 'estimate';
        }
        cardinality.value += metadata.cardinality.value;
      } else {
        cardinality.type = 'estimate';
        cardinality.value = Number.POSITIVE_INFINITY;
        break;
      }
    }
    return {
      cardinality,
      canContainUndefs: metadatas.some(metadata => metadata.canContainUndefs),
    };
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const predicate = <Algebra.Alt> operation.predicate;

    const subOperations: IQueryOperationResultBindings[] = (await Promise.all(predicate.input
      .map(subPredicate => this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY
          .createPath(operation.subject, subPredicate, operation.object, operation.graph),
      }))))
      .map(ActorQueryOperation.getSafeBindings);

    const bindingsStream = new UnionIterator(subOperations.map(op => op.bindingsStream), { autoStart: false });
    const metadata: (() => Promise<MetadataBindings>) = () =>
      Promise.all(subOperations.map(output => output.metadata()))
        .then(ActorQueryOperationPathAlt.unionMetadata);
    const variables = uniqTerms((<RDF.Variable[]> []).concat
      .apply([], subOperations.map(op => op.variables)));

    return {
      type: 'bindings',
      bindingsStream,
      variables,
      metadata,
    };
  }
}
