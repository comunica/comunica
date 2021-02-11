import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator, UnionIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Update CompositeUpdate Query Operation Actor.
 */
export class ActorQueryOperationUpdateCompositeUpdate
  extends ActorQueryOperationTypedMediated<Algebra.CompositeUpdate> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'compositeupdate');
  }

  public async testOperation(pattern: Algebra.CompositeUpdate, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.CompositeUpdate, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    // Initialize result streams using open-ended union iterators
    const quadStreamInsertedStreams = new BufferedIterator<RDF.Stream & AsyncIterator<RDF.Quad>>({ autoStart: false });
    const quadStreamDeletedStreams = new BufferedIterator<RDF.Stream & AsyncIterator<RDF.Quad>>({ autoStart: false });
    const quadStreamInserted = new UnionIterator(quadStreamInsertedStreams, { autoStart: false });
    const quadStreamDeleted = new UnionIterator(quadStreamDeletedStreams, { autoStart: false });

    const updateResult = (async(): Promise<void> => {
      // Execute update operations in sequence
      for (const operation of pattern.updates) {
        const subResult = ActorQueryOperation
          .getSafeUpdate(await this.mediatorQueryOperation.mediate({ operation, context }));
        await subResult.updateResult;

        // Push the result iterators into our union iterators
        if (subResult.quadStreamInserted) {
          (<any>quadStreamInsertedStreams)._push(subResult.quadStreamInserted);
        }
        if (subResult.quadStreamDeleted) {
          (<any>quadStreamDeletedStreams)._push(subResult.quadStreamDeleted);
        }
      }

      // End the result iterators
      quadStreamInsertedStreams.close();
      quadStreamDeletedStreams.close();
    })();

    return {
      type: 'update',
      updateResult,
      quadStreamInserted,
      quadStreamDeleted,
    };
  }
}
