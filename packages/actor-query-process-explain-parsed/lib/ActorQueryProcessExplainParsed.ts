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
import type { IActorTest } from '@comunica/core';
import { ActionContextKey } from '@comunica/core';

/**
 * A comunica Explain Parsed Query Process Actor.
 */
export class ActorQueryProcessExplainParsed extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;

  public constructor(args: IActorQueryProcessExplainParsedArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<IActorTest> {
    if ((action.context.get(KeysInitQuery.explain) ||
      action.context.get(new ActionContextKey('explain'))) !== 'parsed') {
      throw new Error(`${this.name} can only explain in 'parsed' mode.`);
    }
    return true;
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Parse the query
    const { operation } = await this.queryProcessor.parse(action.query, action.context);

    return {
      result: {
        explain: true,
        type: 'parsed',
        data: operation,
      },
    };
  }
}

export interface IActorQueryProcessExplainParsedArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
}
