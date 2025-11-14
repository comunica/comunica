import { Readable } from 'node:stream';
import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import { KeysStatistics } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
import type { ILink, IActionContext, IQueryBindingsOptions, MetadataBindings, ILinkQueue } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState, SourceStateGetter } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import '@comunica/utils-jest';

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const EventEmitter = require('node:events');

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const v = DF.variable('v');

// Dummy class for testing
class DummyIterator extends LinkedRdfSourcesAsyncRdfIterator {
  public linkQueue: ILinkQueue | undefined;

  public constructor(
    operation: Algebra.Operation,
    queryBindingsOptions: IQueryBindingsOptions | undefined,
    context: IActionContext,
    firstUrl: ILink,
    sourceStateGetter: SourceStateGetter,
    maxIterators = 64,
  ) {
    super(operation, queryBindingsOptions, context, firstUrl, maxIterators, sourceStateGetter);
  }

  public async getLinkQueue(): Promise<ILinkQueue> {
    if (!this.linkQueue) {
      this.linkQueue = new LinkQueueFifo();
    }
    return this.linkQueue;
  }

  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.next ? [{ url: metadata.next }] : [];
  }

  protected async accumulateMetadata(
    accumulatedMetadata: MetadataBindings,
    appendingMetadata: MetadataBindings,
  ): Promise<MetadataBindings> {
    return { ...accumulatedMetadata, ...appendingMetadata };
  }
}

// Dummy class that produces multiple next page links
class DummyIteratorMultiple extends DummyIterator {
  protected override async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.next ? [{ url: metadata.next }, { url: metadata.next }] : [];
  }
}

// Dummy class that produces multiple next page links
class DummyIteratorErrorLinks extends DummyIterator {
  protected override async getSourceLinks(): Promise<ILink[]> {
    throw new Error('DummyErrorLinks');
  }
}

// Dummy class that rejects on getLinkQueue
class DummyIteratorErrorLinkQueueFirst extends DummyIterator {
  public override getLinkQueue(): Promise<ILinkQueue> {
    return Promise.reject(new Error('DummyErrorLinkQueueFirst'));
  }
}

// Dummy class that rejects on getLinkQueue when called for the second time
class DummyIteratorErrorLinkQueueLater extends DummyIterator {
  public calls = 0;

  public override getLinkQueue(): Promise<ILinkQueue> {
    if (this.calls++ === 0) {
      return super.getLinkQueue();
    }
    return Promise.reject(new Error('DummyErrorLinkQueueLater'));
  }
}

// Dummy class with a rejecting accumulateMetadata
class DummyIteratorErrorAccumulate extends DummyIterator {
  protected override accumulateMetadata(): Promise<MetadataBindings> {
    return Promise.reject(new Error('accumulateMetadata error'));
  }
}

function getPage(link: ILink): number {
  return link.url.startsWith('P') ? Number.parseInt(link.url.slice(1), 10) : 0;
}

describe('LinkedRdfSourcesAsyncRdfIterator', () => {
  const operation = AF.createPattern(v, v, v, v);
  const queryBindingsOptions: IQueryBindingsOptions = {};
  let context: IActionContext = new ActionContext();

  // Source input is array of arrays (`data`), with every array corresponding to a page.
  let data: RDF.Bindings[][];
  let createdSubIterator: any;
  let sourceStateGetter: SourceStateGetter;

  beforeEach(() => {
    createdSubIterator = new EventEmitter();
    sourceStateGetter = async(link: ILink): Promise<ISourceState> => {
      const requestedPage = getPage(link);
      if (data && requestedPage >= data.length) {
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ requestedPage },
          source: <any>{
            queryBindings() {
              const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
              it.setProperty('metadata', { subseq: true, next: undefined });
              createdSubIterator.emit('data', it);
              return it;
            },
          },
        };
      }
      return {
        link,
        handledDatasets: { [link.url]: true },
        metadata: <any>{ requestedPage, firstPageToken: true, next: `P${requestedPage + 1}` },
        source: <any>{
          queryBindings() {
            const it = new ArrayIterator<RDF.Bindings>([ ...data[requestedPage] ], { autoStart: false });
            it.setProperty('metadata', { subseq: true, next: `P${requestedPage + 1}` });
            createdSubIterator.emit('data', it);
            return it;
          },
        },
      };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('A LinkedRdfSourcesAsyncRdfIterator instance with negative maxIterators', () => {
    expect(() => new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter, -64))
      .toThrow('LinkedRdfSourcesAsyncRdfIterator.maxIterators must be larger than zero, but got -64');
  });

  describe('A LinkedRdfSourcesAsyncRdfIterator instance', () => {
    it('handles a single page', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(it).toEqualBindingsStream(data.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(4);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
    });

    it('handles metadata for a single page before consuming data', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        firstPageToken: true,
        state: expect.any(MetadataValidationState),
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });

      await expect(it).toEqualBindingsStream(data.flat());
    });

    it('handles and caches metadata for a single page before consuming data', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        firstPageToken: true,
        state: expect.any(MetadataValidationState),
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });
      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        firstPageToken: true,
        state: expect.any(MetadataValidationState),
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });

      await expect(it).toEqualBindingsStream(data.flat());
    });

    it('handles metadata for a single page before consuming data and handle source getter errors', async() => {
      const sourceStateGetterOld = sourceStateGetter;
      let called = false;
      sourceStateGetter = async(link: ILink): Promise<ISourceState> => {
        if (called) {
          return await sourceStateGetterOld(link, {});
        }
        called = true;
        throw new Error(`sourceStateGetter error`);
      };

      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      const spy = jest.fn();
      const spyError = jest.fn();
      it.on('error', spyError);
      it.getProperty('metadata', spy);
      await new Promise(setImmediate);
      expect(spy).not.toHaveBeenCalled();
      expect(spyError).toHaveBeenCalledWith(new Error(`sourceStateGetter error`));

      await expect(it).toEqualBindingsStream(data.flat());
    });

    it('handles metadata for a single page before consuming data and handle accumulateMetadata errors', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it =
        new DummyIteratorErrorAccumulate(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        firstPageToken: true,
        state: expect.any(MetadataValidationState),
        next: 'P1',
        requestedPage: 0,
      });
    });

    it('handles metadata for a single page after consuming data', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(it).toEqualBindingsStream(data.flat());

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        firstPageToken: true,
        next: undefined,
        requestedPage: 0,
        subseq: true,
      });
    });

    it('handles a single empty page', async() => {
      data = toBindings([[]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(data.flat());
    });

    it('handles metadata for a single empty page before consuming data', async() => {
      data = toBindings([[]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        firstPageToken: true,
        state: expect.any(MetadataValidationState),
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });

      await expect(it).toEqualBindingsStream(data.flat());
    });

    it('handles metadata for a single empty page after consuming data', async() => {
      data = toBindings([[]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await expect(it).toEqualBindingsStream(data.flat());

      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        firstPageToken: true,
        next: undefined,
        requestedPage: 0,
        subseq: true,
      });
    });

    it('handles multiple pages', async() => {
      data = toBindings([
        [
          [ 'a', 'b', 'c' ],
          [ 'd', 'e', 'f' ],
          [ 'g', 'h', 'i' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
        [
          [ 'a', 'b', '4' ],
          [ 'd', 'e', '5' ],
          [ 'g', 'h', '6' ],
        ],
      ]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(data.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledWith({ first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledWith({ first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledWith({ P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledWith({ P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledWith({ P3: true }, true);
    });

    it('handles multiple pages with multiple next page links', async() => {
      data = toBindings([
        [
          [ 'a', 'b', 'c' ],
          [ 'd', 'e', 'f' ],
          [ 'g', 'h', 'i' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
      ]);
      const it = new DummyIteratorMultiple(
        operation,
        queryBindingsOptions,
        context,
        { url: 'first' },
        sourceStateGetter,
      );
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(toBindings([
        [
          [ 'a', 'b', 'c' ],
          [ 'd', 'e', 'f' ],
          [ 'g', 'h', 'i' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
      ]).flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(13);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(6, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(7, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(8, { first: true }, false);
    });

    it('destroys currentIterators when closed', async() => {
      data = toBindings([
        [
          [ 'a', 'b', 'c' ],
          [ 'd', 'e', 'f' ],
          [ 'g', 'h', 'i' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
        [
          [ 'a', 'b', '4' ],
          [ 'd', 'e', '5' ],
          [ 'g', 'h', '6' ],
        ],
      ]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);

      // Trigger iterator start
      it.read();

      // Wait until sub-iterator has been created
      const subIt = await new Promise(resolve => createdSubIterator.on('data', resolve));
      const destroySpy = jest.spyOn(<any> subIt, 'destroy');

      // Sanity check to make sure sub-iterator has been created
      expect((<any> it).currentIterators).toHaveLength(1);
      expect(destroySpy).not.toHaveBeenCalled();

      // Close the main iterator
      it.destroy();

      // Check if sub-iterator has been closed as well
      expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it('rejects on invalid sourceStateGetter results', async() => {
      data = toBindings([[], [], [], []]);
      const sourceStateGetterThis = async() => {
        throw new Error('sourceStateGetter error');
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
        setImmediate(() => it.close());
      })).rejects.toThrow('sourceStateGetter error');
    });

    it('catches invalid sourceStateGetter results within the _read call', async() => {
      data = toBindings([[], [], [], []]);
      let call = 0;
      const sourceStateGetterThis = async(link: ILink, handledDatasets: Record<string, boolean>) => {
        if (++call === 3) {
          throw new Error('sourceStateGetter error');
        }
        return sourceStateGetter(link, handledDatasets);
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      await expect(new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', () => reject(new Error('No NextSourceSecond error was emitted')));
        it.on('data', () => {
          // Do nothing
        });
      })).resolves.toEqual(new Error('sourceStateGetter error'));
    });

    it('catches invalid sourceStateGetter results on next page', async() => {
      data = toBindings([[], [], [], []]);
      const sourceStateGetterThis = async(link: ILink, handledDatasets: Record<string, boolean>) => {
        if (getPage(link) >= 1) {
          throw new Error('sourceStateGetter error');
        }
        return sourceStateGetter(link, handledDatasets);
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      await expect(new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {
          // Do nothing
        });
      })).resolves.toEqual(new Error('sourceStateGetter error'));
    });

    it('handles metadata overriding on first page', async() => {
      data = toBindings([
        [
          [ 'a', 'b', 'c' ],
          [ 'd', 'e', 'f' ],
          [ 'g', 'h', 'i' ],
        ],
        [
          [ 'a', 'b', '1' ],
          [ 'd', 'e', '2' ],
          [ 'g', 'h', '3' ],
        ],
      ]);
      const sourceStateGetterThis = async(link: ILink) => {
        const requestedPage = getPage(link);
        if (requestedPage >= data.length) {
          return {
            link,
            handledDatasets: { [link.url]: true },
            metadata: <any>{ requestedPage },
            source: <any>{
              queryBindings() {
                const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
                it.setProperty('metadata', { subseq: true, next: undefined });
                return it;
              },
            },
          };
        }
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ firstPageToken: true, next: `P${requestedPage + 1}` },
          source: <any>{
            queryBindings() {
              const quads = new ArrayIterator<RDF.Bindings>([ ...data[requestedPage] ], { autoStart: false });
              quads.on('newListener', () => quads.setProperty('metadata', {
                next: `P${requestedPage + 1}`,
                override: true,
              }));
              return quads;
            },
          },
        };
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(data.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(6);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { first: true }, false);
    });

    it('handles metadata event emitted before the end event', async() => {
      data = toBindings([]);
      const sourceStateGetterThis = async(link: ILink) => {
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ firstPageToken: true },
          source: <any> {
            queryBindings() {
              const slowReadable = new Readable();
              slowReadable._read = () => {
                setTimeout(() => slowReadable.push(null), 100);
              };
              const quads = wrap(slowReadable, { autoStart: false });
              quads.setProperty('metadata', { override: true });
              return quads;
            },
          },
        };
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(data.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(3);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, true);
    });

    it('handles metadata event emitted after the end event', async() => {
      data = toBindings([]);
      const sourceStateGetterThis = async(link: ILink) => {
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ firstPageToken: true },
          source: <any> {
            queryBindings() {
              const quads = new ArrayIterator<RDF.Quad>([], { autoStart: false });
              quads.on('end', () => {
                setTimeout(() => {
                  quads.setProperty('metadata', { override: true });
                }, 100);
              });
              return quads;
            },
          },
        };
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      await expect(it).toEqualBindingsStream(data.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(2);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
    });

    it('delegates error events from the source', async() => {
      data = toBindings([[], []]);
      const sourceStateGetterThis = async(link: ILink) => {
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ next: 'NEXT' },
          source: <any> {
            queryBindings() {
              const quads = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
              quads.on('newListener', (event) => {
                if (event === 'end') {
                  quads.emit('error', new Error('Emitted error!'));
                }
              });
              return quads;
            },
          },
        };
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('Emitted error!'));
    });

    it('delegates sync error events from the source', async() => {
      data = toBindings([[], []]);
      const sourceStateGetterThis = async(link: ILink) => {
        return {
          link,
          handledDatasets: { [link.url]: true },
          metadata: <any>{ next: 'NEXT' },
          source: <any> {
            queryBindings() {
              throw new Error('Thrown sync error!');
            },
          },
        };
      };
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetterThis);
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('Thrown sync error!'));
    });

    it('delegates error events from getSourceLinks', async() => {
      data = toBindings([[], []]);
      const it = new DummyIteratorErrorLinks(
        operation,
        queryBindingsOptions,
        context,
        { url: 'first' },
        sourceStateGetter,
      );
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinks'));
    });

    it('delegates error events from rejecting link queue fetching', async() => {
      data = toBindings([[], []]);
      const it =
        new DummyIteratorErrorLinkQueueFirst(
          operation,
          queryBindingsOptions,
          context,
          { url: 'first' },
          sourceStateGetter,
        );
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinkQueueFirst'));
    });

    it('delegates error events from later rejecting link queue fetching', async() => {
      data = toBindings([[], []]);
      const it =
        new DummyIteratorErrorLinkQueueLater(
          operation,
          queryBindingsOptions,
          context,
          { url: 'first' },
          sourceStateGetter,
        );
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinkQueueLater'));
    });

    it('delegates error events from accumulateMetadata', async() => {
      data = toBindings([[], []]);
      const it =
        new DummyIteratorErrorAccumulate(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('accumulateMetadata error'));
    });

    it('records dereference events when passed a dereference statistic', async() => {
      const cb = jest.fn(() => {});
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());

      const statisticTracker: StatisticLinkDereference = new StatisticLinkDereference();
      statisticTracker.on(cb);

      context = context.set(KeysStatistics.dereferencedLinks, statisticTracker);

      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      await it.toArray();
      expect(cb).toHaveBeenCalledWith({
        url: 'P1',
        metadata: {
          dereferencedTimestamp: performance.now(),
          dereferenceOrder: 0,
          requestedPage: 1,
          type: 'Object',
        },
      });
    });

    it('handles kickstarts before consuming data', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      const spy = jest.spyOn(<any> it, '_fillBufferAsync');
      it.kickstart();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('handles kickstarts only once', async() => {
      data = toBindings([[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]]);
      const it = new DummyIterator(operation, queryBindingsOptions, context, { url: 'first' }, sourceStateGetter);
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      const spy = jest.spyOn(<any> it, '_fillBufferAsync');
      it.kickstart();
      await new Promise(setImmediate);
      it.kickstart();
      await new Promise(setImmediate);
      it.kickstart();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});

function toBindings(data: string[][][]): RDF.Bindings[][] {
  return data.map((page: string[][]) => page.map((bindings: string[]) => {
    return BF.bindings(bindings.map((term: string, i: number) => {
      return [ DF.variable(i.toString()), DF.literal.call(null, term) ];
    }));
  }));
}
