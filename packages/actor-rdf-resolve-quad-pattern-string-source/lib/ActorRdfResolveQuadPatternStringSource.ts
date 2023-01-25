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
import LRUCache = require('lru-cache');
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
    const rdfSourcePromise: Promise<RDF.Source> = this.cache?.get(source) ?? this.getRdfSource(action.context, source);
    if (this.cache && !this.cache.has(source)) {
      this.cache.set(source, rdfSourcePromise);
    }
    return new Promise((resolve, reject) => rdfSourcePromise
      .then(rdfSource => {
        const resolveQuadAction: IActionRdfResolveQuadPattern = {
          pattern: action.pattern,
          context: action.context.set(KeysRdfResolveQuadPattern.source, {
            value: rdfSource,
            type: 'rdfjsSource',
          }),
        };
        resolve(this.mediatorRdfResolveQuadPattern.mediate(resolveQuadAction));
      }).catch(reject));
  }

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
    const rdfStore = await storeStream(parseResult.handle.data);

    return rdfStore;
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
   * The maximum number of entries in the LRU cache, set to 0 to disable.
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
