import { ActorQueryOperationUnion } from '@comunica/actor-query-operation-union';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  MetadataBindings,
  TermsOrder,
} from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { OrderedUnionIterator } from './OrderedUnionIterator';

/**
 * A comunica Union Query Operation Actor that keeps the term order that its inputs share.
 *
 * It only handles unions that an optimizer annotated with `orderUseful`: the variables that the union shares
 * with the other inputs of the join it is in, which a merge join could join it on.
 * When all inputs are sorted on a common prefix starting with one of those variables, the bindings are emitted in
 * that order, and the union reports it as its `termOrder`. Otherwise, the inputs are read in turn.
 */
export class ActorQueryOperationUnionOrdered extends ActorQueryOperationTypedMediated<Algebra.Union> {
  public readonly mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;

  public constructor(args: IActorQueryOperationUnionOrderedArgs) {
    super(args, Algebra.Types.UNION);
    this.mediatorRdfMetadataAccumulate = args.mediatorRdfMetadataAccumulate;
  }

  /**
   * The longest term order that all inputs are sorted on, on variables that every input binds,
   * if it starts with one of the given variables.
   * @param metadatas The metadata of the inputs.
   * @param variables The names of the variables on which an order is useful.
   */
  public static getUsefulOrder(
    metadatas: MetadataBindings[],
    variables: string[],
  ): TermsOrder<RDF.Variable> | undefined {
    const orders = metadatas.map(metadata => metadata.termOrder ?? []);
    const prefix: TermsOrder<RDF.Variable> = [];
    for (let i = 0; i < Math.min(...orders.map(order => order.length)); i++) {
      const entry = orders[0][i];
      if (!orders.every(order => order[i].term.value === entry.term.value && order[i].direction === entry.direction) ||
        !metadatas.every(metadata => metadata.variables
          .some(variable => variable.variable.value === entry.term.value && !variable.canBeUndef))) {
        break;
      }
      prefix.push(entry);
    }
    return prefix.length > 0 && variables.includes(prefix[0].term.value) ? prefix : undefined;
  }

  public async testOperation(operation: Algebra.Union, _context: IActionContext): Promise<TestResult<IActorTest>> {
    const variables = operation.metadata?.orderUseful;
    if (!Array.isArray(variables) || variables.length === 0) {
      return failTest(`${this.name} only handles unions whose order is useful to a join`);
    }
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Union, context: IActionContext): Promise<IQueryOperationResult> {
    const variables = <string[]> operation.metadata!.orderUseful;
    const outputs: IQueryOperationResultBindings[] = (await Promise.all(operation.input
      .map(subOperation => this.mediatorQueryOperation.mediate({ operation: subOperation, context }))))
      .map(getSafeBindings);

    const bindingsStream = new OrderedUnionIterator(outputs.map(output => output.bindingsStream));
    const metadata = async(): Promise<MetadataBindings> => {
      const metadatas = await Promise.all(outputs.map(output => output.metadata()));
      const unionMetadata = await ActorQueryOperationUnion
        .unionMetadata(metadatas, true, context, this.mediatorRdfMetadataAccumulate);
      const termOrder = bindingsStream.useOrder(ActorQueryOperationUnionOrdered.getUsefulOrder(metadatas, variables));
      if (!termOrder) {
        return unionMetadata;
      }
      return { ...unionMetadata, termOrder, canSeek: metadatas.every(entry => entry.canSeek) || undefined };
    };
    return { type: 'bindings', bindingsStream, metadata };
  }
}

export interface IActorQueryOperationUnionOrderedArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for accumulating metadata.
   */
  mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
}
