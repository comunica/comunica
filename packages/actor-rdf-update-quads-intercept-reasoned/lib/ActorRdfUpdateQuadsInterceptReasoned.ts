import type { MediatorRdfReason } from '@comunica/bus-rdf-reason';
import { getContextWithImplicitDataset } from '@comunica/bus-rdf-reason';
import type { MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import type {
  IActorRdfUpdateQuadsInterceptArgs, IActorRdfUpdateQuadsInterceptOutput,
} from '@comunica/bus-rdf-update-quads-intercept';
import { ActorRdfUpdateQuadsIntercept } from '@comunica/bus-rdf-update-quads-intercept';
import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';
import { DataFactory } from 'n3';
import { Factory } from 'sparqlalgebrajs';

const { defaultGraph, variable } = DataFactory;

const factory = new Factory();

/**
 * A comunica Reasoned RDF Update Quads Intercept Actor.
 */
export class ActorRdfUpdateQuadsInterceptReasoned extends ActorRdfUpdateQuadsIntercept {
  public readonly mediatorRdfReason: MediatorRdfReason;
  public readonly mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;

  public constructor(args: IActorRdfUpdateQuadsInterceptReasonedArgs) {
    super(args);
  }

  public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
    const actor = await this.mediatorRdfUpdateQuads.mediateActor(action);
    return actor.test(action);
  }

  public async run(action: IActionRdfUpdateQuads): Promise<IActorRdfUpdateQuadsInterceptOutput> {
    // TODO: Remove this logic into an actor on top of the update-quads bus that allows you to
    // view quad updates.
    const getQuadsFromGraph = async(graph: RDF.Quad_Graph): Promise<AsyncIterator<RDF.Quad>> => {
      const { data } = await this.mediatorRdfResolveQuadPattern.mediate({
        context: action.context,
        pattern: factory.createPattern(variable('?s'), variable('?p'), variable('?o'), graph),
      });
      return data;
    };

    async function getGraphDeletedQuads(graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[]):
    Promise<AsyncIterator<RDF.Quad>> {
      switch (graphs) {
        case 'ALL':
          return getQuadsFromGraph(defaultGraph());
        case 'NAMED':
          return (await getQuadsFromGraph(variable('?g'))).filter(quad => !quad.graph.equals(defaultGraph()));
        default:
          if (Array.isArray(graphs)) {
            // Remove Promise.all usage once https://github.com/RubenVerborgh/AsyncIterator/issues/42 is resolved
            const iterators = await Promise.all(graphs.map(graph => getQuadsFromGraph(graph)));
            return new UnionIterator<RDF.Quad>(iterators, { autoStart: false });
          }
          return getQuadsFromGraph(graphs);
      }
    }

    return {
      execute: async() => {
        const quadStreamDelete = [
          action.deleteGraphs?.graphs && await getGraphDeletedQuads(action.deleteGraphs.graphs),
          action.quadStreamDelete?.clone(),
        ].filter((x): x is AsyncIterator<RDF.Quad> => x !== undefined);

        const { execute: executeReasoning } = await this.mediatorRdfReason.mediate({
          context: getContextWithImplicitDataset(action.context),
          updates: {
            quadStreamDelete: new UnionIterator<RDF.Quad>(quadStreamDelete, { autoStart: false }),
            quadStreamInsert: action.quadStreamInsert?.clone(),
          },
        });

        // Long term actor should start a reasoning lock
        await executeReasoning();
        // Long term the actor should disable a reasoning lock here

        const { execute } = await this.mediatorRdfUpdateQuads.mediate({
          ...action,
          // We need to clone the quad streams prior to the update
          // so that these streams can be used by the inferencing engine
          quadStreamInsert: action.quadStreamInsert?.clone(),
          quadStreamDelete: action.quadStreamDelete?.clone(),
        });

        // We may also need to start/stop an update lock here
        await execute();
      },
    };
  }
}

export interface IActorRdfUpdateQuadsInterceptReasonedArgs extends IActorRdfUpdateQuadsInterceptArgs {
  mediatorRdfReason: MediatorRdfReason;
  mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;
}
