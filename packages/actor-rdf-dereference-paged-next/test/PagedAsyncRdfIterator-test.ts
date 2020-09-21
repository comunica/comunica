import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { PagedAsyncRdfIterator } from '../lib/PagedAsyncRdfIterator';
const DF = new DataFactory();

// Dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends PagedAsyncRdfIterator {
  public data: RDF.Quad[][];

  public constructor(data: RDF.Quad[][]) {
    super('url');
    this.data = data;
  }

  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    onNextPage(page >= this.data.length ? undefined : 'valid');
    return Promise.resolve(new ArrayIterator<RDF.Quad>(page >= this.data.length ? [] : this.data[page],
      { autoStart: false }));
  }
}

// Dummy class with an invalid getIterator function
class InvalidDummy extends Dummy {
  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    return Promise.reject(new Error('InvalidDummy'));
  }
}

// Dummy class where the onNextPage function call is delayed
class DelayedDummy extends Dummy {
  public data: RDF.Quad[][];

  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    setTimeout(() => {
      onNextPage(page >= this.data.length ? undefined : 'valid');
    }, 150);
    return Promise.resolve(new ArrayIterator<RDF.Quad>(page >= this.data.length ? [] : this.data[page],
      { autoStart: false }));
  }
}

describe('PagedAsyncRdfIterator', () => {
  describe('A PagedAsyncRdfIterator instance', () => {
    it('handles a single page', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads);
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
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
      const it = new Dummy(quads);
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });

    it('catches invalid getIterator results', done => {
      const it = new InvalidDummy([[]]);
      it.on('data', () => {
        // Do nothing
      });
      it.on('error', () => done());
      // Will timeout if no error is thrown
    });

    it('handles a single page with delayed metadata', done => {
      const data = [[
        [ 'a', 'b', 'c' ],
        [ 'd', 'e', 'f' ],
        [ 'g', 'h', 'i' ],
      ]];
      const quads = toTerms(data);
      const it = new DelayedDummy(quads);
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });

    it('handles multiple pages with delayed metadata', done => {
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
      const it = new DelayedDummy(quads);
      const result: any = [];
      it.on('data', d => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
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
