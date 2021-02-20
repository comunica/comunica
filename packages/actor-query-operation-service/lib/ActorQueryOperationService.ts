import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated,
  Bindings } from '@comunica/bus-query-operation';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { SingletonIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Service Query Operation Actor.
 * It unwraps the SERVICE operation and executes it on the given source.
 */
export class ActorQueryOperationService extends ActorQueryOperationTypedMediated<Algebra.Service> {
  public readonly forceSparqlEndpoint: boolean;

  public constructor(args: IActorQueryOperationServiceArgs) {
    super(args, 'service');
  }

  public async testOperation(pattern: Algebra.Service, context: ActionContext): Promise<IActorTest> {
    if (pattern.name.termType !== 'NamedNode') {
      throw new Error(`${this.name} can only query services by IRI, while a ${pattern.name.termType} was given.`);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Service, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const endpoint: string = pattern.name.value;

    // Adjust our context to only have the endpoint as source
    context = context || ActionContext({});
    let subContext: ActionContext = context
      .delete(KeysRdfResolveQuadPattern.source)
      .delete(KeysRdfResolveQuadPattern.sources);
    const sourceType = this.forceSparqlEndpoint ? 'sparql' : 'auto';
    subContext = subContext.set(KeysRdfResolveQuadPattern.sources, [{ type: sourceType, value: endpoint }]);

    // Query the source
    let output: IActorQueryOperationOutputBindings;
    try {
      output = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: pattern.input, context: subContext }),
      );
    } catch (error: unknown) {
      if (pattern.silent) {
        // Emit a single empty binding
        output = {
          bindingsStream: new SingletonIterator(Bindings({})),
          type: 'bindings',
          variables: [],
          canContainUndefs: false,
        };
      } else {
        throw error;
      }
    }

    return output;
  }
}

export interface IActorQueryOperationServiceArgs extends IActorQueryOperationTypedMediatedArgs {
  forceSparqlEndpoint: boolean;
}
