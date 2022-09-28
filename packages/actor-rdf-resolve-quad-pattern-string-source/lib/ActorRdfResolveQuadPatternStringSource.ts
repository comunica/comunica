import type { MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import { getContextSource
  , ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternArgs, IActorRdfResolveQuadPatternOutput,
  MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { ISerializeDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { storeStream } from 'rdf-store-stream';
import { Readable } from 'readable-stream';

/**
 * A comunica RDF Resolve Quad Pattern String Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternStringSource extends ActorRdfResolveQuadPattern {
  public static readonly sourceType = 'stringSource';
  private readonly mediatorRdfParse: MediatorRdfParseHandle;
  private readonly mediatorRdfQuadPattern: MediatorRdfResolveQuadPattern;

  public constructor(args: IActorRdfResolveQuadPatternStringSource) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const source = getContextSource(action.context);
    if (!source) {
      throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a source.`);
    }

    if (!this.isStringSource(source.valueOf())) {
      throw new Error(`Actor ${this.name} can only resolve stringSource quad pattern`);
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source = <ISerializeDataSource>getContextSource(action.context);

    const textStream = new Readable({ objectMode: true });
    /* istanbul ignore next */
    textStream._read = () => {
      // Do nothing
    };
    textStream.push(<string>source.value);
    textStream.push(null);

    const parserResult = await this.mediatorRdfParse.mediate({
      context: action.context,
      handle: {
        metadata: { baseIRI: source.baseIri },
        data: textStream,
        context: action.context,
      },
      handleMediaType: source.mediaType,
    });

    const resolveQuadAction: IActionRdfResolveQuadPattern = {
      pattern: action.pattern,
      context: action.context.set(KeysRdfResolveQuadPattern.source, {
        value: <RDF.Source> await storeStream(parserResult.handle.data),
        type: 'rdfjsSource',
      }),
    };
    return this.mediatorRdfQuadPattern.mediate(resolveQuadAction);
  }

  private isStringSource(datasource: any): datasource is ISerializeDataSource {
    if (!('type' in datasource)) {
      return false;
    }
    if (!(typeof datasource.value === 'string')) {
      return false;
    }
    return datasource.type === ActorRdfResolveQuadPatternStringSource.sourceType &&
    'mediaType' in datasource && <string> datasource.value !== '';
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
