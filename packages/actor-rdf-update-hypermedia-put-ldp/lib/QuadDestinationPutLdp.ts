import type { MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { MediatorRdfSerialize, MediatorRdfSerializeMediaTypes } from '@comunica/bus-rdf-serialize';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import { validateHttpResponse } from '@comunica/bus-rdf-update-quads';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';

/**
 * A quad destination that represents a resource that can be PUT.
 */
export class QuadDestinationPutLdp implements IQuadDestination {
  private readonly url: string;
  private readonly context: IActionContext;
  private readonly mediaTypes: string[];

  private readonly mediatorHttp: MediatorHttp;

  public readonly mediatorRdfSerializeMediatypes: MediatorRdfSerializeMediaTypes;

  private readonly mediatorRdfSerialize: MediatorRdfSerialize;

  public constructor(
    url: string,
    context: IActionContext,
    mediaTypes: string[],
    mediatorHttp: MediatorHttp,
    mediatorRdfSerializeMediatypes: MediatorRdfSerializeMediaTypes,
    mediatorRdfSerialize: MediatorRdfSerialize,
  ) {
    this.url = url;
    this.context = context;
    this.mediaTypes = mediaTypes;
    this.mediatorHttp = mediatorHttp;
    this.mediatorRdfSerializeMediatypes = mediatorRdfSerializeMediatypes;
    this.mediatorRdfSerialize = mediatorRdfSerialize;
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapRdfUpdateRequest('INSERT', quads);
  }

  public async delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    throw new Error(`Put-based LDP destinations don't support deletions`);
  }

  public async wrapRdfUpdateRequest(type: 'INSERT' | 'DELETE', quads: AsyncIterator<RDF.Quad>): Promise<void> {
    // Determine media type for serialization
    const { mediaTypes } = await this.mediatorRdfSerializeMediatypes.mediate(
      { context: this.context, mediaTypes: true },
    );
    const availableMediaTypes = this.mediaTypes
      .filter(mediaType => mediaType in mediaTypes);
    // Fallback to our own preferred media type
    const mediaType = availableMediaTypes.length > 0 ?
      availableMediaTypes[0] :
      Object.keys(mediaTypes).sort((typeA, typeB) => mediaTypes[typeB] - mediaTypes[typeA])[0];

    // Serialize quads
    const { handle: { data }} = await this.mediatorRdfSerialize.mediate({
      context: this.context,
      handle: { quadStream: quads, context: this.context },
      handleMediaType: mediaType,
    });

    // Send data in (LDP) PUT request
    const headers: Headers = new Headers({ 'content-type': mediaType });
    const httpResponse = await this.mediatorHttp.mediate({
      context: this.context,
      init: {
        headers,
        method: 'PUT',
        body: ActorHttp.toWebReadableStream(data),
      },
      input: this.url,
    });

    await validateHttpResponse(this.url, httpResponse);
  }

  public async deleteGraphs(
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    throw new Error(`Put-based LDP destinations don't support named graphs`);
  }

  public async createGraphs(graphs: RDF.NamedNode[], requireNonExistence: boolean): Promise<void> {
    throw new Error(`Put-based LDP destinations don't support named graphs`);
  }
}
