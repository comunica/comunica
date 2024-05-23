import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
  MediatorQuerySourceIdentify,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { IActionRdfParseHandle, MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import type { IActorTest } from '@comunica/core';
import type {
  IQuerySourceSerialized,
  QuerySourceUnidentifiedExpanded,
  IActionContext,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { storeStream } from 'rdf-store-stream';
import { Readable } from 'readable-stream';

/**
 * A comunica Serialized Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifySerialized extends ActorQuerySourceIdentify {
  public readonly cacheSize: number;
  public readonly mediatorRdfParse: MediatorRdfParseHandle;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public constructor(args: IActorQuerySourceIdentifySerializedArgs) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<IActorTest> {
    if (!this.isStringSource(action.querySourceUnidentified)) {
      throw new Error(`${this.name} requires a single query source with serialized type to be present in the context.`);
    }
    return true;
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    // Delegate source identification to the same bus again, by converting the string into an RDF/JS source
    return await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: {
        type: 'rdfjs',
        value: await this.getRdfSource(action.context, <IQuerySourceSerialized> action.querySourceUnidentified),
        context: action.querySourceUnidentified.context,
      },
      context: action.context,
    });
  }

  /**
   * Parses the string data source through the RDF parse bus, returning the RDF source.
   * @param context The run action context
   * @param source The source from the run action context
   * @returns Parsed RDF source that can be passed to quad pattern resolve mediator as an RDF/JS source
   */
  protected async getRdfSource(context: IActionContext, source: IQuerySourceSerialized): Promise<RDF.Source> {
    const textStream = new Readable({ objectMode: true });
    /* istanbul ignore next */
    textStream._read = () => {
      // Do nothing
    };
    textStream.push(source.value);
    textStream.push(null);

    const parseAction: IActionRdfParseHandle = {
      context,
      handle: {
        metadata: { baseIRI: source.baseIRI },
        data: textStream,
        context,
      },
      handleMediaType: source.mediaType,
    };

    const parseResult = await this.mediatorRdfParse.mediate(parseAction);
    return await storeStream(parseResult.handle.data);
  }

  private isStringSource(source: QuerySourceUnidentifiedExpanded): source is IQuerySourceSerialized {
    if (!('type' in source)) {
      if (!(typeof source.value === 'string')) {
        return false;
      }
      return 'mediaType' in source;
    }
    return source.type === 'serialized';
  }
}

export interface IActorQuerySourceIdentifySerializedArgs extends IActorQuerySourceIdentifyArgs {
  /**
   * The quad pattern parser mediator.
   */
  mediatorRdfParse: MediatorRdfParseHandle;
  /**
   * The query source identify mediator.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
