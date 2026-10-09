import type { ActionContext, ActionObject } from '@comunica/types';
import type { QueryEngineBaseInit } from './QueryEngineBaseInit';
import { Bus } from '@comunica/bus-core';
import { HttpUrl } from '@comunica/bus-http-url';
import { Init, MediatedAsync } from '@comunica/context-utils';
import { ParserRdf } from '@comunica/bus-rdf-parse';
import { UpdateQuadsBus } from '@comunica/bus-update-quads';
import type { IAction } from '@comunica/types';
import type { Quad } from 'rdf-js';
import { Readable } from 'readable-stream';

/**
 * Base implementation for query engines with an optional update method.
 */
export class QueryEngineBase implements QueryEngineBaseInit {
  public readonly bus: Bus;
  public readonly httpUrl: HttpUrl;
  public readonly parserRdf: ParserRdf;
  public readonly updateQuadsBus: UpdateQuadsBus;

  public constructor(init: QueryEngineBaseInit) {
    this.bus = init.bus;
    this.httpUrl = init.httpUrl;
    this.parserRdf = init.parserRdf;
    this.updateQuadsBus = init.updateQuadsBus;
  }

  /**
   * Parse an RDF stream using the engine's own parsers after context preprocessing.
   * This ensures that e.g. JSON-LD remote contexts are fetched through the engine's HTTP bus and settings.
   * @param data The stream to parse.
   * @param mediaType The media type of the data.
   * @param metadata Optional metadata.
   * @param context Optional action context.
   * @returns The parsed quad stream.
   */
  @Init()
  @MediatedAsync(() => 'parse', { type: 'stream' })
  public async parseRdf(
    data: Readable,
    mediaType: string,
    metadata: Record<string, unknown>,
    context?: ActionContext,
  ): Promise<Quad[]> {
    // Preprocess the context using the same logic as query execution
    const preprocessedContext = await this.bus.preprocessContext(context || new ActionContext());

    const action: IAction = {
      ...metadata,
      mediaType,
    };

    const stream = await this.parserRdf.mediate({
      action,
      context: preprocessedContext,
      data,
    });

    // Collect the stream into an array
    const quads: Quad[] = [];
    for await (const quad of stream) {
      quads.push(quad);
    }
    return quads;
  }

  /**
   * Pass RDF/JS quad streams to insert or delete via the update quads bus,
   * after the same context preprocessing a query gets.
   * @param update The update operation ('insert' or 'delete').
   * @param context Optional action context.
   * @returns The result of the update operation.
   */
  @Init()
  @MediatedAsync(() => 'update-quads')
  public async updateQuads(
    update: 'insert' | 'delete',
    context?: ActionContext,
  ): Promise<void> {
    const preprocessedContext = await this.bus.preprocessContext(context || new ActionContext());

    await this.updateQuadsBus.mediate({
      action: {
        update,
      },
      context: preprocessedContext,
    });
  }
}
