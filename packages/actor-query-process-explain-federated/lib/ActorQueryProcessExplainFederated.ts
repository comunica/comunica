import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  IQueryProcessSequential,
} from '@comunica/bus-query-process';
import {
  ActorQueryProcess,
} from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid, ActionContextKey } from '@comunica/core';
import type { IQuerySource } from '@comunica/types';
import type { Factory } from 'sparqlalgebrajs';
import { Algebra, Util, toSparql } from 'sparqlalgebrajs';

/**
 * Comunica query process actor to produce a federated version of the input query,
 * with algebra operation source assignments converted into SERVICE clauses.
 */
export class ActorQueryProcessExplainFederated extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;

  public constructor(args: IActorQueryProcessExplainFederatedArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    if ((action.context.get(KeysInitQuery.explain) ??
      action.context.get(new ActionContextKey('explain'))) !== 'federated') {
      return failTest(`${this.name} can only explain in 'federated' mode.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Parse and optimize the query
    let { operation, context } = await this.queryProcessor.parse(action.query, action.context);
    ({ operation, context } = await this.queryProcessor.optimize(operation, context));

    const callbacks = Object.fromEntries([
      Algebra.types.PATTERN,
      Algebra.types.BGP,
    ].map(at => [ at, (op: Algebra.Operation, factory: Factory) => {
      const innerSource = <IQuerySource | undefined>(<any>op.metadata?.scopedSource)?.source?.innerSource;

      if (innerSource && typeof innerSource.referenceValue === 'string') {
        const service = factory.createService(op, factory.dataFactory.namedNode(innerSource.referenceValue));
        return { recurse: false, result: service };
      }

      return { recurse: true, result: op };
    } ]));

    const operationWithServiceClauses = Util.mapOperation(operation, callbacks);

    return {
      result: {
        explain: true,
        type: 'federated',
        data: toSparql(operationWithServiceClauses),
      },
    };
  }
}

export interface IActorQueryProcessExplainFederatedArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
}
