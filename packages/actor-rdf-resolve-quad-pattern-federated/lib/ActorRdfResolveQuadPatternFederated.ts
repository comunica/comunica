import type { MediatorRdfMetadataAccumulate,
  IActionRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
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
  public readonly mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly skipEmptyPatterns: boolean;

  protected readonly emptyPatterns: Map<IDataSource, RDF.Quad[]> = new Map();

  public constructor(args: IActorRdfResolveQuadPatternFederatedArgs) {
    super(args);

    // TODO: remove this backwards-compatibility in the next major version, and make the param mandatory
    if (!args.mediatorRdfMetadataAccumulate) {
      this.mediatorRdfMetadataAccumulate = <any> {
        async mediate(action: IActionRdfMetadataAccumulate) {
          if (action.mode === 'initialize') {
            return { metadata: { cardinality: { type: 'exact', value: 0 }, canContainUndefs: false }};
          }

          const metadata = { ...action.accumulatedMetadata };
          const subMetadata = action.appendingMetadata;
          if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
            // We're already at infinite, so ignore any later metadata
            metadata.cardinality.type = 'estimate';
            metadata.cardinality.value = Number.POSITIVE_INFINITY;
          } else {
            if (subMetadata.cardinality.type === 'estimate') {
              metadata.cardinality.type = 'estimate';
            }
            metadata.cardinality.value += subMetadata.cardinality.value;
          }
          if (metadata.requestTime || subMetadata.requestTime) {
            metadata.requestTime = metadata.requestTime || 0;
            subMetadata.requestTime = subMetadata.requestTime || 0;
            metadata.requestTime += subMetadata.requestTime;
          }
          if (metadata.pageSize || subMetadata.pageSize) {
            metadata.pageSize = metadata.pageSize || 0;
            subMetadata.pageSize = subMetadata.pageSize || 0;
            metadata.pageSize += subMetadata.pageSize;
          }
          if (subMetadata.canContainUndefs) {
            metadata.canContainUndefs = true;
          }

          return { metadata };
        },
      };
    }
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
      this.mediatorRdfMetadataAccumulate,
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
   * The RDF metadata accumulate mediator.
   */
  mediatorRdfMetadataAccumulate?: MediatorRdfMetadataAccumulate;
  /**
   * If quad patterns that are sub-patterns of empty quad patterns should be skipped.
   * This assumes that sources remain static during query evaluation.
   * @default {false}
   */
  skipEmptyPatterns?: boolean;
}
