import type {
  IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternArgs,
  IQuadSource, MediatorRdfResolveQuadPattern,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  ActorRdfResolveQuadPatternSource, getContextSources,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { FederatedQuadSource } from './FederatedQuadSource';

/**
 * A comunica Federated RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFederated extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternFederatedArgs {
  public readonly mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
  public readonly skipEmptyPatterns: boolean;

  protected readonly emptyPatterns: Map<IDataSource, RDF.Quad[]> = new Map();

  public constructor(args: IActorRdfResolveQuadPatternFederatedArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const sources = getContextSources(action.context);
    if (!sources) {
      throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a sources array.`);
    }
    return true;
  }

  protected async getSource(context: IActionContext): Promise<IQuadSource> {
    return new FederatedQuadSource(
      this.mediatorResolveQuadPattern,
      context,
      this.emptyPatterns,
      this.skipEmptyPatterns,
    );
  }
}

export interface IActorRdfResolveQuadPatternFederatedArgs extends IActorRdfResolveQuadPatternArgs {
  /**
   * The quad pattern resolve mediator.
   */
  mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
  /**
   * If quad patterns that are sub-patterns of empty quad patterns should be skipped.
   * This assumes that sources remain static during query evaluation.
   * @default {false}
   */
  skipEmptyPatterns?: boolean;
}
