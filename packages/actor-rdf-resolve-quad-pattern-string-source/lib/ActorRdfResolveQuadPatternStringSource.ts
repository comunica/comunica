import type { MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import { getContextSource
  , ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type {
  IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternArgs, IActorRdfResolveQuadPatternOutput,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActorTest } from '@comunica/core';
import type { ISerializeDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';

/**
 * A comunica RDF Resolve Quad Pattern String Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternStringSource extends ActorRdfResolveQuadPattern {
  private readonly sourceType = 'stringSource';
  private readonly mediatorRdfParse: MediatorRdfParseHandle;

  public constructor(args: IActorRdfResolveQuadPatternStringSource) {
    super(args);
    this.mediatorRdfParse = args.mediatorRdfParse;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const source = getContextSource(action.context);
    if (!source) {
      throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a source.`);
    }
    const datasouce = source.valueOf();

    if (!this.isStringSource(datasouce)) {
      throw new Error(`Actor ${this.name} can only resolve stringSource quad pattern`);
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source = <ISerializeDataSource>getContextSource(action.context);
    // Create a temporary text stream for pushing all the text chunks
    const textStream = new Readable({ objectMode: true });
    /* istanbul ignore next */
    textStream._read = () => {
      // Do nothing
    };
    textStream.push(<string>source.value);
    textStream.push(null);

    const parseAction = {
      context: action.context,
      handle: {
        metadata: { baseIRI: source.baseIri },
        data: textStream,
        context: action.context,
      },
      handleMediaType: source.mediaType,
    };

    const parserResult = await this.mediatorRdfParse.mediate(parseAction);
    const quadAsyncIter: AsyncIterator<RDF.Quad> = wrap(parserResult.handle.data);
    return { data: quadAsyncIter };
  }

  private isStringSource(datasouce: any): datasouce is ISerializeDataSource {
    if (!('type' in datasouce)) {
      return false;
    }
    if (!(typeof datasouce.value === 'string')) {
      return false;
    }
    return datasouce.type === this.sourceType && 'mediaType' in datasouce && <string> datasouce.value !== '';
  }
}

export interface IActorRdfResolveQuadPatternStringSource extends IActorRdfResolveQuadPatternArgs {
  /**
   * The quad pattern parser mediator.
   */
  mediatorRdfParse: MediatorRdfParseHandle;
}
