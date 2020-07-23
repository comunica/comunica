import { literal as lit } from '@rdfjs/data-model';
import { ArrayIterator } from 'asynciterator';
import * as RDF from 'rdf-js';
import { ISourceState, LinkedRdfSourcesAsyncRdfIterator } from '../lib/LinkedRdfSourcesAsyncRdfIterator';

const quad = require('rdf-quad');

// Dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends LinkedRdfSourcesAsyncRdfIterator {
  public data: RDF.Quad[][];

  public constructor(data: RDF.Quad[][], subject: RDF.Term | undefined, predicate: RDF.Term | undefined,
    object: RDF.Term | undefined, graph: RDF.Term | undefined,
    firstUrl: string) {
    super(10, subject, predicate, object, graph, firstUrl, { autoStart: false });
    this.data = data;
  }

  protected async getNextUrls(metadata: {[id: string]: any}): Promise<string[]> {
    return metadata.next ? [ metadata.next ] : [];
  }

  protected getPage(url: string) {
    return url.startsWith('P') ? parseInt(url.slice(1), 10) : 0;
  }

  protected async getNextSource(url: string): Promise<ISourceState> {
    const requestedPage = this.getPage(url);
    if (requestedPage >= this.data.length) {
      return {
        handledDatasets: { [url]: true },
        metadata: {},
        source: <any> {
          match: () => new ArrayIterator<RDF.Quad>([]),
        },
      };
    }
    return {
      handledDatasets: { [url]: true },
      metadata: { firstPageToken: true, next: `P${requestedPage + 1}` },
      source: <any> {
        match: () => new ArrayIterator<RDF.Quad>(this.data[requestedPage].concat([])),
      },
    };
  }
}

// Dummy class with a rejecting getNextSource
class InvalidDummy extends Dummy {
  protected getNextSource(url: string): Promise<ISourceState> {
    return Promise.reject(new Error('NextSource error'));
  }
}

// Dummy class with a rejecting getNextSource on the second page
class InvalidDummyNext extends Dummy {
  protected getNextSource(url: string): Promise<ISourceState> {
    if (this.getPage(url) >= 1) {
      return Promise.reject(new Error('NextSource2 error'));
    }
    return super.getNextSource(url);
  }
}

// Dummy class with a metadata override event on the first page
class DummyMetaOverride extends Dummy {
  protected async getNextSource(url: string): Promise<ISourceState> {
    const requestedPage = this.getPage(url);
    if (requestedPage >= this.data.length) {
      return {
        handledDatasets: { [url]: true },
        metadata: {},
        source: <any> {
          match: () => new ArrayIterator<RDF.Quad>([]),
        },
      };
    }
    return {
      handledDatasets: { [url]: true },
      metadata: { firstPageToken: true, next: `P${requestedPage + 1}` },
      source: <any> {
        match: () => {
          const quads = new ArrayIterator<RDF.Quad>(this.data[requestedPage].concat([]));
          quads.on('newListener', () => quads.emit('metadata', { next: `P${requestedPage + 1}`, override: true }));
          return quads;
        },
      },
    };
  }
}

// Dummy class with a metadata override event on the first page
class DummyMetaOverrideTooLate extends Dummy {
  protected async getNextSource(url: string): Promise<ISourceState> {
    const requestedPage = 0;
    return {
      handledDatasets: { [url]: true },
      metadata: { next: 'NEXT' },
      source: <any> {
        match() {
          const quads = new ArrayIterator<RDF.Quad>([]);
          quads.on('end', () => {
            quads.emit('metadata', { next: `P${requestedPage + 1}`, override: true });
          });
          return quads;
        },
      },
    };
  }
}

// Dummy class that produces multiple next page links
class DummyMultiple extends Dummy {
  protected async getNextUrls(metadata: {[id: string]: any}): Promise<string[]> {
    return metadata.next ? [ metadata.next, metadata.next ] : [];
  }
}

// Dummy class that emits an error in the source stream
class DummyError extends Dummy {
  protected async getNextSource(url: string): Promise<ISourceState> {
    return {
      handledDatasets: { [url]: true },
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

describe('LinkedRdfSourcesAsyncRdfIterator', () => {
  describe('A LinkedRdfSourcesAsyncRdfIterator instance', () => {
    it('handles a single page', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('handles a single page when the first source is pre-loaded', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'getNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
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
      const it1 = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      it1.setSourcesState();
      const it2 = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      it2.setSourcesState(it1.sourcesState);
      jest.spyOn(<any> it2, 'getNextUrls');
      const result: any = [];
      it2.on('data', d => result.push(d));
      it2.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it2).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it2).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it2).getNextUrls).toHaveBeenCalledWith({});
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
      const it = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(4);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P2' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P3' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
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
      const it = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'getNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(4);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P2' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P3' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
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
      const it = new DummyMultiple(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
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
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(7);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });

        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P2' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P2' });

        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('catches invalid getNextSource results', async() => {
      const it = new InvalidDummy([[]], undefined, undefined, undefined, undefined, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {
          // Do nothing
        });
      })).toEqual(new Error('NextSource error'));
    });

    it('catches invalid getNextSource results on next page', async() => {
      const it = new InvalidDummyNext([[], []], undefined, undefined, undefined, undefined, 'first');
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
      const it = new DummyMetaOverride(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(3);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1', override: true });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('errors when the metadata event is emitted after the end event', async() => {
      const data: any = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideTooLate(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      await expect(new Promise((resolve, reject) => {
        it.on('data', d => result.push(d));
        it.on('error', resolve);
      })).resolves.toThrow(new Error('Received metadata AFTER the source iterator was ended.'));
    });

    it('calling _read while already iterating should not do anything', () => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, undefined, undefined, undefined, undefined, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      (<any> it).started = true;
      (<any> it).iterating = true;
      (<any> it)._read(1, () => {
        // Do nothing
      });
      expect((<any> it).getNextUrls).not.toHaveBeenCalled();
    });

    it('delegates error events from the source', async() => {
      const it = new DummyError([[], []], undefined, undefined, undefined, undefined, 'first');
      await expect(new Promise((resolve, reject) => {
        it.on('error', reject);
        it.on('end', resolve);
        it.on('data', () => {
          // Do nothing
        });
      })).rejects.toThrow(new Error('Emitted error!'));
    });
  });
});

function toTerms(data: any) {
  return data.map((page: any) => page.map((terms: any) => lit.call(null, terms)));
}

function flatten(a: any) {
  // eslint-disable-next-line prefer-spread
  return [].concat.apply([], a);
}
