import {ActorQueryOperationTyped, Bindings, IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {

  constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args, 'values');
  }

  public async testOperation(pattern: Algebra.Values, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Values, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(pattern.bindings.map(Bindings));
    const metadata = () => Promise.resolve({ totalItems: pattern.bindings.length });
    const variables: string[] = pattern.variables.map(termToString);
    return { type: 'bindings', bindingsStream, metadata, variables };
  }

}
