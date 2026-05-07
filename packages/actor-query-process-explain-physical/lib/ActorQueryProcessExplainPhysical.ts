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
import { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

/**
 * A comunica Explain Physical Query Process Actor.
 */
export class ActorQueryProcessExplainPhysical extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;

  /**
   * @param args Arguments for this actor.
   */
  public constructor(args: IActorQueryProcessExplainPhysicalArgs) {
    super(args);
    this.queryProcessor = args.queryProcessor;
  }

  /**
   * Tests whether this actor can handle the given query process action.
   * @param action The query process action to test.
   * @return A test result that passes only for 'physical' or 'physical-json' explain modes.
   */
  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    const mode = (action.context.get(KeysInitQuery.explain) ?? action.context.get(new ActionContextKey('explain')));
    if (mode !== 'physical' && mode !== 'physical-json') {
      return failTest(`${this.name} can only explain in 'physical' or 'physical-json' mode.`);
    }
    return passTestVoid();
  }

  /**
   * Runs the query, collects the physical query plan, and returns it as the result.
   * @param action The query process action containing the query and context.
   * @return The explain output containing the physical query plan.
   */
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

    const mode = (action.context.get(KeysInitQuery.explain) ??
      action.context.getSafe(new ActionContextKey('explain')));
    return {
      result: {
        explain: true,
        type: mode,
        data: mode === 'physical' ? physicalQueryPlanLogger.toCompactString() : physicalQueryPlanLogger.toJson(),
      },
    };
  }
}

/**
 * Arguments interface for {@link ActorQueryProcessExplainPhysical}.
 */
export interface IActorQueryProcessExplainPhysicalArgs extends IActorQueryProcessArgs {
  /** The sequential query processor used to parse, optimize, and evaluate queries. */
  queryProcessor: IQueryProcessSequential;
}
