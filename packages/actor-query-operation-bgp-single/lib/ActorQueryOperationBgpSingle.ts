import {
  ActorQueryOperationTypedMediated, getMetadata, IActorQueryOperationOutput, IActorQueryOperationTypedMediatedArgs,
  KEY_CONTEXT_BGP_PARENTMETADATA, KEY_CONTEXT_PATTERN_PARENTMETADATA,
} from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Query Operation Actor for BGPs with a single pattern.
 */
export class ActorQueryOperationBgpSingle extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length !== 1) {
      throw new Error(`Actor ${this.name} can only operate on BGPs with a single pattern.`);
    }
    return true;
  }

  public runOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorQueryOperationOutput> {
    // If we have parent metadata, extract the single parent metadata entry.
    if (context && context.has(KEY_CONTEXT_BGP_PARENTMETADATA)) {
      const metadatas = context.get(KEY_CONTEXT_BGP_PARENTMETADATA);
      context = context.delete(KEY_CONTEXT_BGP_PARENTMETADATA);
      context = context.set(KEY_CONTEXT_PATTERN_PARENTMETADATA, metadatas[0]);
    }

    const output = this.mediatorQueryOperation.mediate({ operation: pattern.patterns[0], context });

    // TODO: We manually trigger the left metadata to be resolved.
    //       If we don't do this, the inner metadata event seems to be lost in some cases,
    //       the left promise above is never resolved, this whole metadata promise is never resolved,
    //       and the application terminates without producing any results.
    /* istanbul ignore next */
    output.then(actualOutput => getMetadata(actualOutput).catch(() => {
      // Do nothing
    })).catch(() => {
      // Do nothing
    });

    return output;
  }
}
