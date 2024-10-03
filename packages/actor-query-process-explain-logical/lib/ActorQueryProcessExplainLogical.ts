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

/**
 * A comunica Explain Logical Query Process Actor.
 */
export class ActorQueryProcessExplainLogical extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;

  public constructor(args: IActorQueryProcessExplainLogicalArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    if ((action.context.get(KeysInitQuery.explain) ??
      action.context.get(new ActionContextKey('explain'))) !== 'logical') {
      return failTest(`${this.name} can only explain in 'logical' mode.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Parse and optimize the query
    let { operation, context } = await this.queryProcessor.parse(action.query, action.context);
    ({ operation, context } = await this.queryProcessor.optimize(operation, context));

    return {
      result: {
        explain: true,
        type: 'logical',
        data: operation,
      },
    };
  }
}

export interface IActorQueryProcessExplainLogicalArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
}
