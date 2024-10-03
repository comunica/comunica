import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL BGP operations by rewriting it as a join operator.
 */
export class ActorQueryOperationBgpJoin extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(_operation: Algebra.Bgp, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Bgp, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    return this.mediatorQueryOperation.mediate({
      operation: algebraFactory.createJoin(operation.patterns),
      context,
    });
  }
}
