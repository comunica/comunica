import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult, IQueryOperationResultBindings } from '@comunica/types';
import { SingletonIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica Service Query Operation Actor.
 * It unwraps the SERVICE operation and executes it on the given source.
 */
export class ActorQueryOperationService extends ActorQueryOperationTypedMediated<Algebra.Service> {
  public readonly forceSparqlEndpoint: boolean;

  public constructor(args: IActorQueryOperationServiceArgs) {
    super(args, 'service');
  }

  public async testOperation(operation: Algebra.Service, context: IActionContext): Promise<IActorTest> {
    if (operation.name.termType !== 'NamedNode') {
      throw new Error(`${this.name} can only query services by IRI, while a ${operation.name.termType} was given.`);
    }
    return true;
  }

  public async runOperation(operation: Algebra.Service, context: IActionContext):
  Promise<IQueryOperationResult> {
    const endpoint: string = operation.name.value;

    // Adjust our context to only have the endpoint as source
    let subContext: IActionContext = context
      .delete(KeysRdfResolveQuadPattern.source)
      .delete(KeysRdfResolveQuadPattern.sources)
      .delete(KeysInitQuery.queryString);
    const sourceType = this.forceSparqlEndpoint ? 'sparql' : undefined;
    subContext = subContext.set(KeysRdfResolveQuadPattern.sources, [{ type: sourceType, value: endpoint }]);
    // Query the source
    let output: IQueryOperationResultBindings;
    try {
      output = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: operation.input, context: subContext }),
      );
    } catch (error: unknown) {
      if (operation.silent) {
        // Emit a single empty binding
        output = {
          bindingsStream: new SingletonIterator(BF.bindings()),
          type: 'bindings',
          metadata: async() => ({ cardinality: { type: 'exact', value: 1 }, canContainUndefs: false, variables: []}),
        };
      } else {
        throw error;
      }
    }

    return output;
  }
}

export interface IActorQueryOperationServiceArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * If the SERVICE target should be assumed to be a SPARQL endpoint.
   * @default {false}
   */
  forceSparqlEndpoint: boolean;
}
