import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { BindingsStream,
  IQueryOperationResultBindings,
  IActionContext,
  IQueryOperationResult,
  MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { UnionIterator } from 'asynciterator';
import { uniqTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Union Query Operation Actor.
 */
export class ActorQueryOperationUnion extends ActorQueryOperationTypedMediated<Algebra.Union> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'union');
  }

  /**
   * Takes the union of the given double array variables.
   * Uniqueness is guaranteed.
   * @param {string[][]} variables Double array of variables to take the union of.
   * @return {string[]} The union of the given variables.
   */
  public static unionVariables(variables: RDF.Variable[][]): RDF.Variable[] {
    return uniqTerms(variables.flat());
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the cardinality metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @param bindings If the union of the variables field should also be taken.
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static unionMetadata<
    Bindings extends boolean,
    M extends (Bindings extends true ? MetadataBindings : MetadataQuads)
  >(metadatas: M[], bindings: Bindings): M {
    // Union cardinality
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

    const metadataBase: MetadataQuads = {
      cardinality,
      canContainUndefs: metadatas.some(metadata => metadata.canContainUndefs),
    };

    // Union variables
    if (bindings) {
      metadataBase.variables = ActorQueryOperationUnion.unionVariables(metadatas.map(metadata => metadata.variables));
      return <M> metadataBase;
    }
    return <M> metadataBase;
  }

  public async testOperation(operation: Algebra.Union, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Union, context: IActionContext):
  Promise<IQueryOperationResult> {
    const outputs: IQueryOperationResultBindings[] = (await Promise.all(operation.input
      .map(subOperation => this.mediatorQueryOperation.mediate({ operation: subOperation, context }))))
      .map(ActorQueryOperation.getSafeBindings);

    const bindingsStream: BindingsStream = new UnionIterator(outputs.map(
      (output: IQueryOperationResultBindings) => output.bindingsStream,
    ), { autoStart: false });

    const metadata: () => Promise<MetadataBindings> = () => Promise.all(outputs.map(output => output.metadata()))
      .then(subMeta => ActorQueryOperationUnion.unionMetadata(subMeta, true));
    return { type: 'bindings', bindingsStream, metadata };
  }
}
