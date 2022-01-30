import * as fs from 'fs';
import { URL } from 'url';
import { promisify } from 'util';
import { ActorRdfDereference, IActionRdfDereference,
  IActorRdfDereferenceArgs,
  IActorRdfDereferenceMediaMappingsArgs,
  IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import { ActorRdfDereferenceMediaMappings } from '@comunica/bus-rdf-dereference';
import type { IActionRdfParseHandle, IActorRdfParseOutput, MediatorRdfParseHandle, MediatorRdfParseMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica File RDF Dereference Actor.
 */
export class ActorRdfDereferenceFile extends ActorRdfDereference {
  public readonly mediatorParse: MediatorRdfParseHandle;
  public readonly mediatorParseMediatypes: MediatorRdfParseMediaTypes;

  public constructor(args: IActorRdfDereferenceFileArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    try {
      await promisify(fs.access)(
        action.url.startsWith('file://') ? new URL(action.url) : action.url, fs.constants.F_OK,
      );
    } catch (error: unknown) {
      throw new Error(
        `This actor only works on existing local files. (${error})`,
      );
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    let { mediaType } = action;

    // Deduce media type from file extension if possible
    if (!mediaType) {
      mediaType = this.getMediaTypeFromExtension(action.url);
    }

    const requestTimeStart = Date.now();
    const parseAction: IActionRdfParseHandle = {
      context: action.context,
      handle: {
        context: action.context,
        metadata: { baseIRI: action.url },
        data: fs.createReadStream(action.url.startsWith('file://') ? new URL(action.url) : action.url),
      },
    };
    const requestTime = Date.now() - requestTimeStart;
    if (mediaType) {
      parseAction.handleMediaType = mediaType;
    }

    let parseOutput: IActorRdfParseOutput;
    try {
      parseOutput = (await this.mediatorParse.mediate(parseAction)).handle;
    } catch (error: unknown) {
      return this.handleDereferenceError(action, error, undefined, requestTime);
    }

    return {
      data: this.handleDereferenceStreamErrors(action, parseOutput.data),
      exists: true,
      requestTime,
      metadata: parseOutput.metadata,
      url: action.url,
    };
  }
}

export interface IActorRdfDereferenceFileArgs extends IActorRdfDereferenceArgs {
  /**
   * Mediator used for parsing the file contents.
   */
  mediatorParse: MediatorRdfParseHandle;
  mediatorParseMediatypes: MediatorRdfParseMediaTypes;
}
