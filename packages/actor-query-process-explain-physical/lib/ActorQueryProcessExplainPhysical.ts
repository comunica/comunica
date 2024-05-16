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
import { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

/**
 * A comunica Explain Physical Query Process Actor.
 */
export class ActorQueryProcessExplainPhysical extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;

  public constructor(args: IActorQueryProcessExplainPhysicalArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<IActorTest> {
    if ((action.context.get(KeysInitQuery.explain) ||
      action.context.get(new ActionContextKey('explain'))) !== 'physical') {
      throw new Error(`${this.name} can only explain in 'physical' mode.`);
    }
    return true;
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Run all query processing steps in sequence

    let { operation, context } = await this.queryProcessor.parse(action.query, action.context);
    ({ operation, context } = await this.queryProcessor.optimize(operation, context));

    // If we need a physical query plan, store a physical query plan logger in the context, and collect it after exec
    const physicalQueryPlanLogger = new MemoryPhysicalQueryPlanLogger();
    context = context.set(KeysInitQuery.physicalQueryPlanLogger, physicalQueryPlanLogger);

    const output = await this.queryProcessor.evaluate(operation, context);

    // Make sure the whole result is produced
    switch (output.type) {
      case 'bindings':
        await output.bindingsStream.toArray();
        break;
      case 'quads':
        await output.quadStream.toArray();
        break;
      case 'boolean':
        await output.execute();
        break;
      case 'void':
        await output.execute();
        break;
    }

    return {
      result: {
        explain: true,
        type: 'physical',
        data: physicalQueryPlanLogger.toJson(),
      },
    };
  }
}

export interface IActorQueryProcessExplainPhysicalArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
}
