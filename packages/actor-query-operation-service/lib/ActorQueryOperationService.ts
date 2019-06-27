import {ActorQueryOperation, ActorQueryOperationTypedMediated,
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {KEY_CONTEXT_SOURCE, KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorTest} from "@comunica/core";
import {SingletonIterator} from "asynciterator";
import {AsyncReiterableArray} from "asyncreiterable";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Service Query Operation Actor.
 * It unwraps the SERVICE operation and executes it on the given source.
 */
export class ActorQueryOperationService extends ActorQueryOperationTypedMediated<Algebra.Service> {

  public readonly forceSparqlEndpoint: boolean;

  constructor(args: IActorQueryOperationServiceArgs) {
    super(args, 'service');
  }

  public async testOperation(pattern: Algebra.Service, context: ActionContext): Promise<IActorTest> {
    if (pattern.name.termType !== 'NamedNode') {
      throw new Error(`${this.name} can only query services by IRI, while a ${pattern.name.termType} was given.`);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Service, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const endpoint: string = pattern.name.value;

    // Adjust our context to only have the endpoint as source
    context = context || ActionContext({});
    let subContext: ActionContext = context.delete(KEY_CONTEXT_SOURCE).delete(KEY_CONTEXT_SOURCES);
    const sourceType = this.forceSparqlEndpoint ? 'sparql' : 'auto';
    subContext = subContext.set(KEY_CONTEXT_SOURCES,
      AsyncReiterableArray.fromFixedData([{ type: sourceType, value: endpoint }]));

    // Query the source
    let output: IActorQueryOperationOutputBindings;
    try {
      output = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: pattern.input, context: subContext }));
    } catch (e) {
      if (pattern.silent) {
        // Emit a single empty binding
        output = {
          bindingsStream: new SingletonIterator(Bindings({})),
          type: 'bindings',
          variables: [],
        };
      } else {
        throw e;
      }
    }

    return output;
  }

}

export interface IActorQueryOperationServiceArgs extends IActorQueryOperationTypedMediatedArgs {
  forceSparqlEndpoint: boolean;
}
