import type { IActionRdfParseHandle, MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import { getContextSource, ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type {
  IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternArgs, IActorRdfResolveQuadPatternOutput,
  MediatorRdfResolveQuadPattern,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IDataSource, IDataSourceSerialized } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { storeStream } from 'rdf-store-stream';
import { Readable } from 'readable-stream';

/**
 * A comunica RDF Resolve Quad Pattern String Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternStringSource extends ActorRdfResolveQuadPattern
  implements IActorRdfResolveQuadPatternStringSourceArgs {
  public readonly cacheSize: number;
  public readonly mediatorRdfParse: MediatorRdfParseHandle;
  public readonly mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;

  public static readonly sourceType = 'stringSource';

  private readonly cache?: LRUCache<IDataSource, Promise<RDF.Source>>;

  public constructor(args: IActorRdfResolveQuadPatternStringSourceArgs) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<IDataSource, Promise<RDF.Source>>({ max: this.cacheSize }) : undefined;
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

  public run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source = <IDataSourceSerialized>getContextSource(action.context)!;
    // A source should only be parsed once (see getRdfSource comment), so if it has been parsed,
    // that earlier result should be used. Note: if the object is identical value-wise, but is not
    // the same exact object, it will get parsed again and saved in the cache as its own entry!
    let rdfSourcePromise = this.cache?.get(source);
    if (!rdfSourcePromise) {
      rdfSourcePromise = this.getRdfSource(action.context, source);
      if (this.cache) {
        this.cache.set(source, rdfSourcePromise);
      }
    }
    return rdfSourcePromise.then(rdfSource => this.mediatorRdfResolveQuadPattern.mediate({
      pattern: action.pattern,
      context: action.context.set(KeysRdfResolveQuadPattern.source, {
        value: rdfSource,
        type: 'rdfjsSource',
      }),
    }));
  }

  /**
   * Parses the string data source through the RDF parse bus, returning the RDF source.
   * Parsing a source with blank nodes may produce different identifiers for the same nodes
   * on different parses, for example if the source gets parsed separately for each pattern
   * in a query. Consequently, a single source should only be parsed once, and the parse result cached.
   * @param context The run action context
   * @param source The source from the run action context
   * @returns Parsed RDF source that can be passed to quad pattern resolve mediator as an rdfjsSource
   */
  protected async getRdfSource(context: IActionContext, source: IDataSourceSerialized): Promise<RDF.Source> {
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

  private isStringSource(datasource: any): datasource is IDataSourceSerialized {
    if (!('type' in datasource)) {
      if (!(typeof datasource.value === 'string')) {
        return false;
      }
      return 'mediaType' in datasource;
    }
    return datasource.type === ActorRdfResolveQuadPatternStringSource.sourceType;
  }
}

export interface IActorRdfResolveQuadPatternStringSourceArgs extends IActorRdfResolveQuadPatternArgs {
  /**
   * The maximum number of parsed stores in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /**
   * The quad pattern parser mediator.
   */
  mediatorRdfParse: MediatorRdfParseHandle;
  /**
   * The rdf resolve quad pattern mediator.
   */
  mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;
}
