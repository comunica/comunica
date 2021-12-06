import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type {
  IQueryableResult,
  BindingsStream,
  IMetadata,
  Bindings,
  IActionContext,
} from '@comunica/types';
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

  public async testOperation(operation: Algebra.Values, context: IActionContext | undefined): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Values, context: IActionContext | undefined):
  Promise<IQueryableResult> {
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(operation.bindings.map(x => BF.bindings(x)));
    const metadata = (): Promise<IMetadata> => Promise.resolve({
      cardinality: operation.bindings.length,
      canContainUndefs: operation.bindings.some(bindings => variables.some(variable => !(variable in bindings))),
    });
    const variables: string[] = operation.variables.map(x => termToString(x));
    return { type: 'bindings', bindingsStream, metadata, variables };
  }
}
