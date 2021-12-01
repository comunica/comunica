import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import type { IQueryableResult, IQueryableResultBindings, BindingsStream, IMetadata, Bindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
const BF = new BindingsFactory();

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {
  public constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IQueryableResult>) {
    super(args, 'values');
  }

  public async testOperation(pattern: Algebra.Values, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Values, context: ActionContext):
  Promise<IQueryableResultBindings> {
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(pattern.bindings.map(x => BF.bindings(x)));
    const metadata = (): Promise<IMetadata> => Promise.resolve({
      cardinality: pattern.bindings.length,
      canContainUndefs: pattern.bindings.some(bindings => variables.some(variable => !(variable in bindings))),
    });
    const variables: string[] = pattern.variables.map(x => termToString(x));
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
