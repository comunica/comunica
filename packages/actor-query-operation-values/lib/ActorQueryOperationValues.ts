import { ActorQueryOperationTyped, Bindings, IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings, BindingsStream } from '@comunica/bus-query-operation';

import { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {
  public constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args, 'values');
  }

  public async testOperation(pattern: Algebra.Values, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Values, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(pattern.bindings.map(x => Bindings(x)));
    const metadata = (): Promise<{[id: string]: any}> => Promise.resolve({ totalItems: pattern.bindings.length });
    const variables: string[] = pattern.variables.map(x => termToString(x));
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
