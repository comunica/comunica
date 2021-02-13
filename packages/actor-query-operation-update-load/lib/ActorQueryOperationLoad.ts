import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from '@comunica/bus-rdf-update-quads';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL load operations.
 */
export class ActorQueryOperationLoad extends ActorQueryOperationTypedMediated<Algebra.Load> {
  public readonly mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;

  private readonly factory: Factory;
  private readonly constructOperation: Algebra.Construct;

  public constructor(args: IActorQueryOperationLoadArgs) {
    super(args, 'load');
    this.factory = new Factory();
    this.constructOperation = this.factory.createConstruct(
      this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
      [ this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ],
    );
  }

  public async testOperation(pattern: Algebra.Load, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Load, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    // Create CONSTRUCT query on the given source
    if (!context) {
      context = ActionContext({});
    }
    let subContext = context.set(KEY_CONTEXT_SOURCES, [ pattern.source.value ]);
    if (pattern.silent) {
      subContext = subContext.set(KEY_CONTEXT_LENIENT, true);
    }
    const output = ActorQueryOperationLoad.getSafeQuads(await this.mediatorQueryOperation.mediate({
      operation: this.constructOperation,
      context: subContext,
    }));

    // Determine quad stream to insert
    let quadStream = output.quadStream;
    if (pattern.destination) {
      quadStream = quadStream.map(quad => DF.quad(quad.subject, quad.predicate, quad.object, pattern.destination));
    }

    // Insert quad stream
    const { updateResult } = await this.mediatorUpdateQuads.mediate({
      quadStreamInsert: quadStream,
      context,
    });

    return {
      type: 'update',
      updateResult,
    };
  }
}

export interface IActorQueryOperationLoadArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;
}

export const KEY_CONTEXT_SOURCES = '@comunica/bus-rdf-resolve-quad-pattern:sources';
export const KEY_CONTEXT_LENIENT = '@comunica/actor-init-sparql:lenient';
