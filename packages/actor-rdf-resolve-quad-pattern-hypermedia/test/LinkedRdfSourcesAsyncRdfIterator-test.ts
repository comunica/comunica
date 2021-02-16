import { Readable } from 'stream';
import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { ArrayIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from '../lib/LinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();
const v = DF.variable('v');

// Dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends LinkedRdfSourcesAsyncRdfIterator {
  public data: RDF.Quad[][];

  public constructor(data: RDF.Quad[][], subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string) {
    super(10, subject, predicate, object, graph, firstUrl);
    this.data = data;
  }

  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.next ? [{ url: metadata.next }] : [];
  }

  protected getPage(url: string) {
    return url.startsWith('P') ? Number.parseInt(url.slice(1), 10) : 0;
  }

  protected async getSource(link: ILink): Promise<ISourceState> {
    const requestedPage = this.getPage(link.url);
    if (requestedPage >= this.data.length) {
      return {
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
      handledDatasets: { [link.url]: true },
      metadata: { requestedPage, firstPageToken: true, next: `P${requestedPage + 1}` },
      source: <any> {
        match: () => {
          const it = new ArrayIterator<RDF.Quad>([ ...this.data[requestedPage] ], { autoStart: false });
          it.setProperty('metadata', { subseq: true });
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

describe('LinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A LinkedRdfSourcesAsyncRdfIterator instance', () => {
    it('handles a single page', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(2);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles metadata for a single page after consuming data', async() => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(flatten(quads));
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
      jest.spyOn(<any> it, 'handleNextUrl');

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
          expect(result).toEqual(flatten(quads));
          resolve();
        });
      });
    });

    it('handles a single empty page', done => {
      const data = [[]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');
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
      jest.spyOn(<any> it, 'handleNextUrl');

      await new Promise<void>(resolve => {
        const result: any = [];
        it.on('data', d => result.push(d));
        it.on('end', () => {
          expect(result).toEqual(flatten(quads));
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
      jest.spyOn(<any> it, 'handleNextUrl');

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
          expect(result).toEqual(flatten(quads));
          resolve();
        });
      });
    });

    it('handles a single page when the first source is pre-loaded', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(2);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles a single page when the first source is pre-loaded from another iterator', done => {
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
      jest.spyOn(<any> it2, 'handleNextUrl');
      const result: any = [];
      it2.on('data', d => result.push(d));
      it2.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it2).handleNextUrl).toHaveBeenCalledTimes(2);
        expect((<any> it2).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it2).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles multiple pages', done => {
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
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(4);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, firstPageToken: true, next: 'P2', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(3, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, firstPageToken: true, next: 'P3', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(4, {
          handledDatasets: { P3: true },
          metadata: { requestedPage: 3, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles multiple pages when the first source is pre-loaded', done => {
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
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(4);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, firstPageToken: true, next: 'P2', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(3, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, firstPageToken: true, next: 'P3', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(4, {
          handledDatasets: { P3: true },
          metadata: { requestedPage: 3, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles multiple pages with multiple next page links', done => {
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
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', (d: any) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(toTerms([
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
        ])));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(7);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { requestedPage: 0, firstPageToken: true, next: 'P1', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, firstPageToken: true, next: 'P2', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(3, {
          handledDatasets: { P1: true },
          metadata: { requestedPage: 1, firstPageToken: true, next: 'P2', subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(4, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(5, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(6, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, subseq: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(7, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, subseq: true },
          source: expect.anything(),
        });
        done();
      });
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

    it('handles metadata overriding on first page', done => {
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
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(3);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { firstPageToken: true, next: 'P1', override: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(2, {
          handledDatasets: { P1: true },
          metadata: { firstPageToken: true, next: 'P2', override: true },
          source: expect.anything(),
        });
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(3, {
          handledDatasets: { P2: true },
          metadata: { requestedPage: 2, subseq: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles metadata event emitted before the end event', done => {
      const data: any = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideEarly(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(1);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { firstPageToken: true, override: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('handles metadata event emitted after the end event', done => {
      const data: any = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideLate(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).handleNextUrl).toHaveBeenCalledTimes(1);
        expect((<any> it).handleNextUrl).toHaveBeenNthCalledWith(1, {
          handledDatasets: { first: true },
          metadata: { firstPageToken: true, override: true },
          source: expect.anything(),
        });
        done();
      });
    });

    it('calling _read while already iterating should not do anything', () => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, v, v, v, v, 'first');
      jest.spyOn(<any> it, 'handleNextUrl');
      (<any> it).started = true;
      (<any> it).iterating = true;
      (<any> it)._read(1, () => {
        // Do nothing
      });
      expect((<any> it).handleNextUrl).not.toHaveBeenCalled();
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
  });
});

function toTerms(data: any) {
  return data.map((page: any) => page.map((terms: any) => DF.literal.call(null, terms)));
}

function flatten(a: any) {
  // eslint-disable-next-line prefer-spread
  return [].concat.apply([], a);
}
