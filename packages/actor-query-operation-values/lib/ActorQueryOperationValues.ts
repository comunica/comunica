import { ActorQueryOperationTyped, Bindings } from '@comunica/bus-query-operation';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import type { IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings, BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';

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
    const metadata = (): Promise<Record<string, any>> => Promise.resolve({ totalItems: pattern.bindings.length });
    const variables: string[] = pattern.variables.map(x => termToString(x));
    const canContainUndefs = pattern.bindings.some(bindings => variables.some(variable => !(variable in bindings)));
    return { type: 'bindings', bindingsStream, metadata, variables, canContainUndefs };
  }
}
