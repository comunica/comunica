import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type { IQueryOperationResult,
  BindingsStream,
  Bindings,
  IActionContext,
  MetadataBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();
const DF = new DataFactory();

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {
  public constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult>) {
    super(args, 'values');
  }

  public async testOperation(operation: Algebra.Values, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Values, context: IActionContext):
  Promise<IQueryOperationResult> {
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(operation.bindings
      .map(x => BF.bindings(Object.entries(x)
        .map(([ key, value ]) => [ DF.variable(key.slice(1)), value ]))));
    const variables = operation.variables;
    const metadata = (): Promise<MetadataBindings> => Promise.resolve({
      cardinality: { type: 'exact', value: operation.bindings.length },
      canContainUndefs: operation.bindings.some(bindings => variables.some(variable => !(`?${variable.value}` in bindings))),
      variables,
    });
    return { type: 'bindings', bindingsStream, metadata };
  }
}
