import * as fs from 'fs';
import { URL } from 'url';
import { promisify } from 'util';
import { ActorRdfDereference, IActionDereference, IActionDereferenceParse, IActionRdfDereference,
  IActionRdfParseMetadata,
  IActorDereferenceOutput,
  IActorDereferenceParseOutput,
  IActorParseOutput,
  IActorRdfDereferenceMediaMappingsArgs,
  IActorRdfDereferenceOutput, 
  IActorRdfParseOutputMetadata} from '@comunica/bus-rdf-dereference';
import { ActorRdfDereferenceMediaMappings } from '@comunica/bus-rdf-dereference';
import { AbstractDereferenceParse, getMediaTypeFromExtension, IAbstractDereferenceParseArgs } from '@comunica/actor-abstract-dereference-parse';
import type { IActionRdfParseHandle, IActorRdfParseOutput, MediatorRdfParseHandle, MediatorRdfParseMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { emptyReadable, isHardError, MediatorDereference } from '@comunica/bus-dereference';
import * as RDF from '@rdfjs/types'
import { IActionParse } from '@comunica/actor-abstract-parse';
import { MediateMediaTyped, MediateMediaTypes } from '@comunica/actor-abstract-mediatyped';
import { PassThrough, Readable } from 'stream';

/**
 * A comunica File RDF Dereference Actor.
 */
 export class ActorRdfDereferenceFile extends AbstractDereferenceParse<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> 
//  ActorRdfDereference
 {
  public constructor(args: IActorRdfDereferenceFileArgs) {
    super(args);
  }

  public readonly mediatorDereference: MediatorDereference;
  // public readonly mediatorParse: MediatorRdfParseHandle;
  public readonly mediatorParse: MediateMediaTyped<IActionParse<any>, IActorTest, IActorParseOutput<any, any>>;
  public readonly mediatorParseMediatypes: MediateMediaTypes;
  public readonly mediaMappings: Record<string, string>;

  // public constructor(args: IAbstractDereferenceParseArgs<S, K, M>) {
  //   super(args);
  // }

  public async test(action: IActionDereference): Promise<IActorTest> {
    return true;
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionDereference} action A dereference action.
   * @param {Readable} data A data stream.
   * @return {Readable} The resulting data stream.
   * TODO: FIX THIS TYPE
   */
  protected handleDereferenceStreamErrors<L, T extends Readable>(action: IActionDereferenceParse<L>, data: T): T {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!isHardError(action.context)) {
      data.on('error', error => {
        this.logError(action.context, error.message, () => ({ url: action.url }));
        // Make sure the errored stream is ended.
        data.push(null);
      });
      data = <PassThrough & T> data.pipe(new PassThrough({ objectMode: true }));
    }
    return data;
  }

  // public async getMetadata(dereference: IActorDereferenceOutput): Promise<K | undefined> {
  //   return undefined;
  // }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    const { context } = action;
    const dereference = await this.mediatorDereference.mediate({
      ...action,
      mediaTypes: async() => (await this.mediatorParseMediatypes?.mediate({ context, mediaTypes: true }))?.mediaTypes,
    });

    let result: IActorRdfParseOutput;
    try {
      result = (await this.mediatorParse.mediate({
        context,
        handle: { context, ...dereference, metadata: await this.getMetadata(dereference) },
        handleMediaType: dereference.mediaType ??
          getMediaTypeFromExtension(dereference.url, this.mediaMappings) ??
          action.mediaType,
      })).handle;
      result.data = this.handleDereferenceStreamErrors(action, result.data);
    } catch (error: unknown) {
      // Close the body, to avoid process to hang
      await dereference.data.close?.();
      if (isHardError(context)) {
        throw error;
      }
      this.logError(context, (<Error> error).message);
      result = { data: emptyReadable() };
    }

    // Return the parsed stream and any metadata
    return { ...dereference, ...result };
  }

  async getMetadata(dereference: IActorDereferenceOutput): Promise<IActionRdfParseMetadata | undefined> {
    return { baseIRI: dereference.url }
  }
}
// export class ActorRdfDereferenceFile extends ActorRdfDereferenceMediaMappings {
//   public readonly mediatorParse: MediatorRdfParseHandle;
//   public readonly mediatorParseMediatypes: MediatorRdfParseMediaTypes;
//   public readonly mediatorDereference: MediatorDereference

//   public constructor(args: IActorRdfDereferenceFileArgs) {
//     super(args);
//   }

//   public async test(action: IActionRdfDereference): Promise<IActorTest> {
//     try {
//       await promisify(fs.access)(
//         action.url.startsWith('file://') ? new URL(action.url) : action.url, fs.constants.F_OK,
//       );
//     } catch (error: unknown) {
//       throw new Error(
//         `This actor only works on existing local files. (${error})`,
//       );
//     }
//     return true;
//   }

//   public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
//     let { mediaType } = action;

//     // Deduce media type from file extension if possible
//     if (!mediaType) {
//       mediaType = this.getMediaTypeFromExtension(action.url);
//     }

//     const requestTimeStart = Date.now();
//     const parseAction: IActionRdfParseHandle = {
//       context: action.context,
//       handle: {
//         context: action.context,
//         metadata: { baseIRI: action.url },
//         data: fs.createReadStream(action.url.startsWith('file://') ? new URL(action.url) : action.url),
//       },
//     };
//     const requestTime = Date.now() - requestTimeStart;
//     if (mediaType) {
//       parseAction.handleMediaType = mediaType;
//     }

//     let parseOutput: IActorRdfParseOutput;
//     try {
//       parseOutput = (await this.mediatorParse.mediate(parseAction)).handle;
//     } catch (error: unknown) {
//       return this.handleDereferenceError(action, error, undefined, requestTime);
//     }

//     return {
//       data: this.handleDereferenceStreamErrors(action, parseOutput.data),
//       exists: true,
//       requestTime,
//       metadata: parseOutput.metadata,
//       url: action.url,
//     };
//   }
// }

export interface IActorRdfDereferenceFileArgs extends IActorArgs<IActionDereferenceParse<IActionRdfParseMetadata>, IActorTest, IActorDereferenceParseOutput<RDF.Stream, IActorRdfParseOutputMetadata>> {
  mediatorDereference: MediatorDereference;
  mediatorParse: MediatorRdfParseHandle;
  // mediatorParse: MediateMediaTyped<IActionParse<IActionRdfParseMetadata>, IActorTest, IActorParseOutput<RDF.Stream, IActorRdfParseOutputMetadata>>;
  mediatorParseMediatypes: MediateMediaTypes;
  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   * @range {json}
   * @default {{
   * "ttl":      "text/turtle",
   * "turtle":   "text/turtle",
   * "nt":       "application/n-triples",
   * "ntriples": "application/n-triples",
   * "nq":       "application/n-quads",
   * "nquads":   "application/n-quads",
   * "rdf":      "application/rdf+xml",
   * "rdfxml":   "application/rdf+xml",
   * "owl":      "application/rdf+xml",
   * "n3":       "text/n3",
   * "trig":     "application/trig",
   * "jsonld":   "application/ld+json",
   * "json":     "application/json",
   * "html":     "text/html",
   * "htm":      "text/html",
   * "xhtml":    "application/xhtml+xml",
   * "xht":      "application/xhtml+xml",
   * "xml":      "application/xml",
   * "svg":      "image/svg+xml",
   * "svgz":     "image/svg+xml"
   * }}
   */
  mediaMappings: Record<string, string>;
}



// IAbstractDereferenceParseArgs<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
  // /**
  //  * A collection of mappings, mapping file extensions to their corresponding media type.
  //  * @range {json}
  //  * @default {{
  //  * "ttl":      "text/turtle",
  //  * "turtle":   "text/turtle",
  //  * "nt":       "application/n-triples",
  //  * "ntriples": "application/n-triples",
  //  * "nq":       "application/n-quads",
  //  * "nquads":   "application/n-quads",
  //  * "rdf":      "application/rdf+xml",
  //  * "rdfxml":   "application/rdf+xml",
  //  * "owl":      "application/rdf+xml",
  //  * "n3":       "text/n3",
  //  * "trig":     "application/trig",
  //  * "jsonld":   "application/ld+json",
  //  * "json":     "application/json",
  //  * "html":     "text/html",
  //  * "htm":      "text/html",
  //  * "xhtml":    "application/xhtml+xml",
  //  * "xht":      "application/xhtml+xml",
  //  * "xml":      "application/xml",
  //  * "svg":      "image/svg+xml",
  //  * "svgz":     "image/svg+xml"
  //  * }}
  //  */
//   mediaMappings: Record<string, string>;
//   /**
//    * Mediator used for parsing the file contents.
//    */
//   // mediatorParse: MediatorRdfParseHandle;
//   // mediatorParseMediatypes: MediatorRdfParseMediaTypes;
//   // mediatorDereference: MediatorDereference;
// }


// IActorArgs<IActionDereferenceParse<K>, IActorTest, IActorDereferenceParseOutput<S, M>> {
//   mediatorDereference: MediatorDereference;
//   mediatorParse: MediateMediaTyped<IActionParse<K>, IActorTest, IActorParseOutput<S, M>>;
//   mediatorParseMediatypes: MediateMediaTypes;
//   mediaMappings: Record<string, string>;
// }
// import { AbstractDereferenceParse, IAbstractDereferenceParseArgs } from '@comunica/actor-abstract-dereference-parse';
// import {
//   IActorDereferenceOutput
// } from '@comunica/bus-rdf-dereference';
// import { IActionRdfParseMetadata, IActorRdfParseOutputMetadata } from '@comunica/bus-rdf-parse';
// import type * as RDF from '@rdfjs/types';

// /**
//  * A comunica File RDF Dereference Actor.
//  */
// export class ActorRdfDereferenceFile extends AbstractDereferenceParse<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
//   public constructor(args: IActorRdfDereferenceFileArgs) {
//     super(args);
//   }

//   async getMetadata(dereference: IActorDereferenceOutput): Promise<IActionRdfParseMetadata | undefined> {
//     return { baseIRI: dereference.url }
//   }
// }

// export interface IActorRdfDereferenceFileArgs extends IAbstractDereferenceParseArgs<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
  // /**
  //  * A collection of mappings, mapping file extensions to their corresponding media type.
  //  * @range {json}
  //  * @default {{
  //  * "ttl":      "text/turtle",
  //  * "turtle":   "text/turtle",
  //  * "nt":       "application/n-triples",
  //  * "ntriples": "application/n-triples",
  //  * "nq":       "application/n-quads",
  //  * "nquads":   "application/n-quads",
  //  * "rdf":      "application/rdf+xml",
  //  * "rdfxml":   "application/rdf+xml",
  //  * "owl":      "application/rdf+xml",
  //  * "n3":       "text/n3",
  //  * "trig":     "application/trig",
  //  * "jsonld":   "application/ld+json",
  //  * "json":     "application/json",
  //  * "html":     "text/html",
  //  * "htm":      "text/html",
  //  * "xhtml":    "application/xhtml+xml",
  //  * "xht":      "application/xhtml+xml",
  //  * "xml":      "application/xml",
  //  * "svg":      "image/svg+xml",
  //  * "svgz":     "image/svg+xml"
  //  * }}
  //  */
  // mediaMappings: Record<string, string>;
// }
