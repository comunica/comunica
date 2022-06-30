import * as EventEmitter from 'events';
import { Readable } from 'stream';
import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from '../lib/LinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();
const v = DF.variable('v');

// Dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends LinkedRdfSourcesAsyncRdfIterator {
  public data: RDF.Quad[][];
  public linkQueue: ILinkQueue = new LinkQueueFifo();
  public createdSubIterator = new EventEmitter();

  public constructor(data: RDF.Quad[][], subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string, maxIterators = 64) {
    super(10, subject, predicate, object, graph, firstUrl, maxIterators);
    this.data = data;
  }

  public async getLinkQueue(): Promise<ILinkQueue> {
    return this.linkQueue;
  }

  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.next ? [{ url: metadata.next }] : [];
  }

  protected getPage(url: string) {
    return url.startsWith('P') ? Number.parseInt(url.slice(1), 10) : 0;
  }

  protected async getSource(link: ILink): Promise<ISourceState> {
    const requestedPage = this.getPage(link.url);
    if (this.data && requestedPage >= this.data.length) {
      return {
        link,
        handledDatasets: { [link.url]: true },
        metadata: { requestedPage },
        source: <any> {
          match() {
            const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
            it.setProperty('metadata', { subseq: true });
            if (this.createdSubIterator) {
              this.createdSubIterator.emit('data', it);
            }
            return it;
          },
        },
      };
    }
    return {
      link,
      handledDatasets: { [link.url]: true },
      metadata: { requestedPage, firstPageToken: true, next: `P${requestedPage + 1}` },
      source: <any> {
        match: () => {
          const it = new ArrayIterator<RDF.Quad>([ ...this.data[requestedPage] ], { autoStart: false });
          it.setProperty('metadata', { subseq: true });
          if (this.createdSubIterator) {
            this.createdSubIterator.emit('data', it);
          }
          return it;
        },
      },
    };
  }
}

// Dummy class with a rejecting getNextSource
class InvalidDummy extends Dummy {
  protected getSource(link: ILink): Promise<ISourceState> {
    return Promise.reject(new Error('NextSource error'));
  }
}

// Dummy class with a rejecting getNextSource in the second call
class InvalidDummySecond extends Dummy {
  public call = 0;
  protected getSourceCached(link: ILink, handledDatasets: Record<string, boolean>): Promise<ISourceState> {
    if (++this.call === 3) {
      return Promise.reject(new Error('NextSourceSecond error'));
    }
    return super.getSourceCached(link, handledDatasets);
  }
}

// Dummy class with a rejecting getNextSource on the second page
class InvalidDummyNext extends Dummy {
  protected getSource(link: ILink): Promise<ISourceState> {
    if (this.getPage(link.url) >= 1) {
      return Promise.reject(new Error('NextSource2 error'));
    }
    return super.getSource(link);
  }
}

// Dummy class with a metadata override event on the first page
class DummyMetaOverride extends Dummy {
  protected async getSource(link: ILink): Promise<ISourceState> {
    const requestedPage = this.getPage(link.url);
    if (requestedPage >= this.data.length) {
      return {
        link,
        handledDatasets: { [link.url]: true },
        metadata: { requestedPage },
        source: <any> {
          match() {
            const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
            it.setProperty('metadata', { subseq: true });
            return it;
          },
        },
      };
    }
    return {
      link,
      handledDatasets: { [link.url]: true },
      metadata: { firstPageToken: true, next: `P${requestedPage + 1}` },
      source: <any> {
        match: () => {
          const quads = new ArrayIterator<RDF.Quad>([ ...this.data[requestedPage] ], { autoStart: false });
          quads.on('newListener', () => quads.setProperty('metadata', { next: `P${requestedPage + 1}`, override: true }));
          return quads;
        },
      },
    };
  }
}

// Dummy class with a metadata override event before end event
class DummyMetaOverrideEarly extends Dummy {
  protected async getSource(link: ILink): Promise<ISourceState> {
    return {
      link,
      handledDatasets: { [link.url]: true },
      metadata: { firstPageToken: true },
      source: <any> {
        match() {
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
  }
}

// Dummy class with a metadata override event after end event
class DummyMetaOverrideLate extends Dummy {
  protected async getSource(link: ILink): Promise<ISourceState> {
    return {
      link,
      handledDatasets: { [link.url]: true },
      metadata: { firstPageToken: true },
      source: <any> {
        match() {
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
  }
}

// Dummy class that produces multiple next page links
class DummyMultiple extends Dummy {
  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.next ? [{ url: metadata.next }, { url: metadata.next }] : [];
  }
}

// Dummy class that emits an error in the source stream
class DummyError extends Dummy {
  protected async getSource(link: ILink): Promise<ISourceState> {
    return {
      link,
      handledDatasets: { [link.url]: true },
      metadata: { next: 'NEXT' },
      source: <any> {
        match() {
          const quads = new ArrayIterator<RDF.Quad>([], { autoStart: false });
          quads.on('newListener', event => {
            if (event === 'end') {
              quads.emit('error', new Error('Emitted error!'));
            }
          });
          return quads;
        },
      },
    };
  }
}

// Dummy class that produces multiple next page links
class DummyErrorLinks extends Dummy {
  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    throw new Error('DummyErrorLinks');
  }
}

// Dummy class that rejects on getLinkQueue
class DummyErrorLinkQueueFirst extends Dummy {
  public getLinkQueue(): Promise<ILinkQueue> {
    return Promise.reject(new Error('DummyErrorLinkQueueFirst'));
  }
}

// Dummy class that rejects on getLinkQueue when called for the second time
class DummyErrorLinkQueueLater extends Dummy {
  public calls = 0;

  public getLinkQueue(): Promise<ILinkQueue> {
    if (this.calls++ === 0) {
      return super.getLinkQueue();
    }
    return Promise.reject(new Error('DummyErrorLinkQueueLater'));
  }
}

describe('LinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A LinkedRdfSourcesAsyncRdfIterator instance with negative maxIterators', () => {
    const data = [[]];
    const quads = toTerms(data);
    expect(() => new Dummy(quads, v, v, v, v, 'first', -64))
      .toThrow('LinkedRdfSourcesAsyncRdfIterator.maxIterators must be larger than zero, but got -64');
  });

  describe('A LinkedRdfSourcesAsyncRdfIterator instance', () => {
    it('handles a single page', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(4);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
    });

    it('handles metadata for a single page after consuming data', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(quads.flat());
          resolve();
        });
      });

      expect(await new Promise(resolve => it.getProperty('metadata', resolve))).toEqual({
        firstPageToken: true,
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });
    });

    it('handles metadata for a single page before consuming data', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      expect(await new Promise(resolve => it.getProperty('metadata', resolve))).toEqual({
        firstPageToken: true,
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(quads.flat());
          resolve();
        });
      });
    });

    it('handles a single empty page', done => {
      const data = [[]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('handles metadata for a single empty page after consuming data', async() => {
      const data = [[]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(quads.flat());
          resolve();
        });
      });

      expect(await new Promise(resolve => it.getProperty('metadata', resolve))).toEqual({
        firstPageToken: true,
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });
    });

    it('handles metadata for a single empty page before consuming data', async() => {
      const data = [[]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');

      expect(await new Promise(resolve => it.getProperty('metadata', resolve))).toEqual({
        firstPageToken: true,
        next: 'P1',
        requestedPage: 0,
        subseq: true,
      });

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(quads.flat());
          resolve();
        });
      });
    });

    it('handles a single page when the first source is pre-loaded', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(4);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
    });

    it('handles a single page when the first source is pre-loaded from another iterator', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it1 = new Dummy(quads, v, v, v, v, 'first');
      it1.setSourcesState();
      const it2 = new Dummy(quads, v, v, v, v, 'first');
      it2.setSourcesState(it1.sourcesState);
      jest.spyOn(<any> it2, 'startIteratorsForNextUrls');
      const result: any = [];
      it2.on('data', d => result.push(d));
      await new Promise(resolve => it2.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it2).startIteratorsForNextUrls).toHaveBeenCalledTimes(4);
      expect((<any> it2).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it2).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it2).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it2).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
    });

    it('handles multiple pages', async() => {
      const data = [
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
      ];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(9);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(6, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(7, { P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(8, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(9, { P3: true }, true);
    });

    it('handles multiple pages when the first source is pre-loaded', async() => {
      const data = [
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
      ];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(8);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(6, { P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(7, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(8, { P3: true }, true);
    });

    it('handles multiple pages with multiple next page links', async() => {
      const data = [
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
      ];
      const quads = toTerms(data);
      const it = new DummyMultiple(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', (d: any) => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(toTerms([
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
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(10);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(6, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(7, { P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(8, { P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(9, { P2: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(10, { P2: true }, true);
    });

    it('destroys currentIterators when closed', async() => {
      const data = [
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
      ];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');

      // Trigger iterator start
      it.read();

      // Wait until sub-iterator has been created
      const subIt = await new Promise(resolve => it.createdSubIterator.on('data', resolve));
      const destroySpy = jest.spyOn(<any> subIt, 'destroy');

      // Sanity check to make sure sub-iterator has been created
      expect((<any> it).currentIterators.length).toEqual(1);
      expect(destroySpy).not.toHaveBeenCalled();

      // Close the main iterator
      it.destroy();

      // Check if sub-iterator has been closed as well
      expect(destroySpy).toHaveBeenCalled();
    });

    it('catches invalid getNextSource results', async() => {
      const it = new InvalidDummy([[]], v, v, v, v, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {
          // Do nothing
        });
      })).toEqual(new Error('NextSource error'));
    });

    it('catches invalid getNextSource results within the _read call', async() => {
      const it = new InvalidDummySecond([[]], v, v, v, v, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', () => reject(new Error('No NextSourceSecond error was emitted')));
        it.on('data', () => {
          // Do nothing
        });
      })).toEqual(new Error('NextSourceSecond error'));
    });

    it('catches invalid getNextSource results on next page', async() => {
      const it = new InvalidDummyNext([[], []], v, v, v, v, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {
          // Do nothing
        });
      })).toEqual(new Error('NextSource2 error'));
    });

    it('handles metadata overriding on first page', async() => {
      const data = [
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
      ];
      const quads = toTerms(data);
      const it = new DummyMetaOverride(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(6);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(4, { P1: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(5, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(6, { P2: true }, true);
    });

    it('handles metadata event emitted before the end event', async() => {
      const data: any = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideEarly(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(3);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(3, { first: true }, true);
    });

    it('handles metadata event emitted after the end event', async() => {
      const data: any = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideLate(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'startIteratorsForNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      await new Promise(resolve => it.on('end', resolve));

      expect(result).toEqual(quads.flat());
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenCalledTimes(2);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(1, { first: true }, false);
      expect((<any> it).startIteratorsForNextUrls).toHaveBeenNthCalledWith(2, { first: true }, true);
    });

    it('delegates error events from the source', async() => {
      const it = new DummyError([[], []], v, v, v, v, 'first');
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('Emitted error!'));
    });

    it('delegates error events from getSourceLinks', async() => {
      const it = new DummyErrorLinks([[], []], v, v, v, v, 'first');
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinks'));
    });

    it('delegates error events from rejecting link queue fetching', async() => {
      const it = new DummyErrorLinkQueueFirst([[], []], v, v, v, v, 'first');
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinkQueueFirst'));
    });

    it('delegates error events from later rejecting link queue fetching', async() => {
      const it = new DummyErrorLinkQueueLater([[], []], v, v, v, v, 'first');
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('DummyErrorLinkQueueLater'));
    });
  });
});

function toTerms(data: any) {
  return data.map((page: any) => page.map((terms: any) => DF.literal.call(null, terms)));
}
