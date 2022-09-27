import type { MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import { getContextSource
  , ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternArgs, IActorRdfResolveQuadPatternOutput,
  MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IDataSource, ISerializeDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { storeStream } from 'rdf-store-stream';
const streamifyString = require('streamify-string');

/**
 * A comunica RDF Resolve Quad Pattern String Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternStringSource extends ActorRdfResolveQuadPattern {
  public static readonly sourceType = 'stringSource';
  private readonly mediatorRdfParse: MediatorRdfParseHandle;
  private readonly mediatorRdfQuadPattern: MediatorRdfResolveQuadPattern;

  public constructor(args: IActorRdfResolveQuadPatternStringSource) {
    super(args);
    this.mediatorRdfParse = args.mediatorRdfParse;
    this.mediatorRdfQuadPattern = args.mediatorRdfQuadPattern;
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

    const textStream = streamifyString(<string> source.value);
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
    const store = await storeStream(parserResult.handle.data);
    const newSource: IDataSource = {
      value: <RDF.Source> store,
      type: 'rdfjsSource',
    };
    const newContext = action.context.set(KeysRdfResolveQuadPattern.source, newSource);

    const resolveQuadAction: IActionRdfResolveQuadPattern = {
      pattern: action.pattern,
      context: newContext,
    };
    const rdfjsSourceResult: Promise<IActorRdfResolveQuadPatternOutput> =
     this.mediatorRdfQuadPattern.mediate(resolveQuadAction);
    return rdfjsSourceResult;
  }

  private isStringSource(datasouce: any): datasouce is ISerializeDataSource {
    if (!('type' in datasouce)) {
      return false;
    }
    if (!(typeof datasouce.value === 'string')) {
      return false;
    }
    return datasouce.type === ActorRdfResolveQuadPatternStringSource.sourceType &&
    'mediaType' in datasouce && <string> datasouce.value !== '';
  }
}

export interface IActorRdfResolveQuadPatternStringSource extends IActorRdfResolveQuadPatternArgs {
  /**
   * The quad pattern parser mediator.
   */
  mediatorRdfParse: MediatorRdfParseHandle;

  /**
   * The rdf resolve quad pattern mediator.
   */
  mediatorRdfQuadPattern: MediatorRdfResolveQuadPattern;
}
