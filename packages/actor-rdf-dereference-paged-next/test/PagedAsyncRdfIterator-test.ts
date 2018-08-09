import {literal as lit} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {PagedAsyncRdfIterator} from "../lib/PagedAsyncRdfIterator";

// dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends PagedAsyncRdfIterator {

  public data: RDF.Quad[][];

  constructor(data: RDF.Quad[][]) {
    super('url');
    this.data = data;
  }

  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    onNextPage(page >= this.data.length ? null : 'valid');
    return Promise.resolve(new ArrayIterator<RDF.Quad>(page >= this.data.length ? [] : this.data[page]));
  }
}

// dummy class with an invalid getIterator function
class InvalidDummy extends Dummy { // tslint:disable-line max-classes-per-file
  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    return Promise.reject('');
  }
}

// dummy class where the onNextPage function call is delayed
class DelayedDummy extends Dummy {// tslint:disable-line max-classes-per-file

  public data: RDF.Quad[][];

  protected getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void) {
    setTimeout(() => {
      onNextPage(page >= this.data.length ? null : 'valid');
    }, 150);
    return Promise.resolve(new ArrayIterator<RDF.Quad>(page >= this.data.length ? [] : this.data[page]));
  }
}

describe('PagedAsyncRdfIterator', () => {

  describe('The PagedAsyncRdfIterator module', () => {
    it('should be a function', () => {
      expect(PagedAsyncRdfIterator).toBeInstanceOf(Function);
    });
  });

  describe('A PagedAsyncRdfIterator instance', () => {
    it('handles a single page', (done) => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads);
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });

    it('handles multiple pages', (done) => {
      const data = [
        [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
          ['g', 'h', 'i'],
        ],
        [
          ['a', 'b', '1'],
          ['d', 'e', '2'],
          ['g', 'h', '3'],
        ],
        [
          ['a', 'b', '4'],
          ['d', 'e', '5'],
          ['g', 'h', '6'],
        ],
      ];
      const quads = toTerms(data);
      const it = new Dummy(quads);
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });

    it('catches invalid getIterator results', (done) => {
      const it = new InvalidDummy([[]]);
      it.on('data', () => {}); // tslint:disable-line no-empty
      it.on('error', done);
      // will timeout if no error is thrown
    });

    it('handles a single page with delayed metadata', (done) => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it = new DelayedDummy(quads);
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });

    it('handles multiple pages with delayed metadata', (done) => {
      const data = [
        [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
          ['g', 'h', 'i'],
        ],
        [
          ['a', 'b', '1'],
          ['d', 'e', '2'],
          ['g', 'h', '3'],
        ],
        [
          ['a', 'b', '4'],
          ['d', 'e', '5'],
          ['g', 'h', '6'],
        ],
      ];
      const quads = toTerms(data);
      const it = new DelayedDummy(quads);
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        done();
      });
    });
  });
});

function toTerms(data) {
  return data.map((page) => page.map((terms) => lit.call(null, terms)));
}

function flatten(a) {
  return [].concat.apply([], a);
}
