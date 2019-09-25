import {literal as lit} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {ISourcesState, ISourceState, LinkedRdfSourcesAsyncRdfIterator} from "../lib/LinkedRdfSourcesAsyncRdfIterator";

const quad = require('rdf-quad');

// dummy class for testing
// input is array of arrays, with every array corresponding to a page
class Dummy extends LinkedRdfSourcesAsyncRdfIterator {

  public data: RDF.Quad[][];

  constructor(data: RDF.Quad[][], subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
              firstUrl: string) {
    super(10, subject, predicate, object, graph, firstUrl, { autoStart: false });
    this.data = data;
  }

  protected async getNextUrls(metadata: {[id: string]: any}): Promise<string[]> {
    return metadata.next ? [metadata.next] : [];
  }

  protected getPage(url: string) {
    return url.startsWith('P') ? parseInt(url.substr(1), 10) : 0;
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
      metadata: { firstPageToken: true, next: 'P' + (requestedPage + 1) },
      source: <any> {
        match: () => new ArrayIterator<RDF.Quad>(this.data[requestedPage].concat([])),
      },
    };
  }
}

// dummy class with a rejecting getNextSource
class InvalidDummy extends Dummy { // tslint:disable-line max-classes-per-file
  protected getNextSource(url: string): Promise<ISourceState> {
    return Promise.reject(new Error('NextSource error'));
  }
}

// dummy class with a rejecting getNextSource on the second page
class InvalidDummyNext extends Dummy { // tslint:disable-line max-classes-per-file
  protected getNextSource(url: string): Promise<ISourceState> {
    if (this.getPage(url) >= 1) {
      return Promise.reject(new Error('NextSource2 error'));
    } else {
      return super.getNextSource(url);
    }
  }
}

// dummy class with a metadata override event on the first page
class DummyMetaOverride extends Dummy { // tslint:disable-line max-classes-per-file
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
      metadata: { firstPageToken: true, next: 'P' + (requestedPage + 1) },
      source: <any> {
        match: () => {
          const quads = new ArrayIterator<RDF.Quad>(this.data[requestedPage].concat([]));
          setImmediate(() => quads.emit('metadata', { next: 'P' + (requestedPage + 1), override: true }));
          return quads;
        },
      },
    };
  }
}

// dummy class with a metadata override event on the first page
class DummyMetaOverrideTooLate extends Dummy { // tslint:disable-line max-classes-per-file
  protected async getNextSource(url: string): Promise<ISourceState> {
    const requestedPage = 0;
    return {
      handledDatasets: { [url]: true },
      metadata: { next: 'NEXT' },
      source: <any> {
        match: () => {
          const quads = new ArrayIterator<RDF.Quad>([]);
          setTimeout(() => quads.emit('metadata', { next: 'P' + (requestedPage + 1), override: true }), 10);
          return quads;
        },
      },
    };
  }
}

// dummy class that produces multiple next page links
class DummyMultiple extends Dummy { // tslint:disable-line max-classes-per-file
  protected async getNextUrls(metadata: {[id: string]: any}): Promise<string[]> {
    return metadata.next ? [metadata.next, metadata.next] : [];
  }
}

// dummy class that emits an error in the source stream
class DummyError extends Dummy { // tslint:disable-line max-classes-per-file
  protected async getNextSource(url: string): Promise<ISourceState> {
    return {
      handledDatasets: { [url]: true },
      metadata: { next: 'NEXT' },
      source: <any> {
        match: () => {
          const quads = new ArrayIterator<RDF.Quad>([]);
          setImmediate(() => quads.emit('error', new Error('Emitted error!')));
          return quads;
        },
      },
    };
  }
}

describe('LinkedRdfSourcesAsyncRdfIterator', () => {

  describe('The LinkedRdfSourcesAsyncRdfIterator module', () => {
    it('should be a function', () => {
      expect(LinkedRdfSourcesAsyncRdfIterator).toBeInstanceOf(Function);
    });
  });

  describe('A LinkedRdfSourcesAsyncRdfIterator instance', () => {
    it('handles a single page', (done) => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('handles a single page when the first source is pre-loaded', (done) => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, null, null, null, null, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('handles a single page when the first source is pre-loaded from another iterator', (done) => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it1 = new Dummy(quads, null, null, null, null, 'first');
      it1.setSourcesState();
      const it2 = new Dummy(quads, null, null, null, null, 'first');
      it2.setSourcesState(it1.sourcesState);
      jest.spyOn(<any> it2, 'getNextUrls');
      const result = [];
      it2.on('data', (d) => result.push(d));
      it2.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it2).getNextUrls).toHaveBeenCalledTimes(2);
        expect((<any> it2).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1' });
        expect((<any> it2).getNextUrls).toHaveBeenCalledWith({});
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
      const it = new Dummy(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
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

    it('handles multiple pages when the first source is pre-loaded', (done) => {
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
      const it = new Dummy(quads, null, null, null, null, 'first');
      it.setSourcesState();
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
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

    it('handles multiple pages with multiple next page links', (done) => {
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
      ];
      const quads = toTerms(data);
      const it = new DummyMultiple(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(toTerms([
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
            ['a', 'b', '1'],
            ['d', 'e', '2'],
            ['g', 'h', '3'],
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

    it('catches invalid getNextSource results', async () => {
      const it = new InvalidDummy([[]], null, null, null, null, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {}); // tslint:disable-line no-empty
      })).toEqual(new Error('NextSource error'));
    });

    it('catches invalid getNextSource results on next page', async () => {
      const it = new InvalidDummyNext([[], []], null, null, null, null, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {}); // tslint:disable-line no-empty
      })).toEqual(new Error('NextSource2 error'));
    });

    it('handles metadata overriding on first page', (done) => {
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
      ];
      const quads = toTerms(data);
      const it = new DummyMetaOverride(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      it.on('data', (d) => result.push(d));
      it.on('end', () => {
        expect(result).toEqual(flatten(quads));
        expect((<any> it).getNextUrls).toHaveBeenCalledTimes(3);
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({ firstPageToken: true, next: 'P1', override: true });
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        expect((<any> it).getNextUrls).toHaveBeenCalledWith({});
        done();
      });
    });

    it('errors when the metadata event is emitted after the end event', async () => {
      const data = [];
      const quads = toTerms(data);
      const it = new DummyMetaOverrideTooLate(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      const result = [];
      return expect(new Promise((resolve, reject) => {
        it.on('data', (d) => result.push(d));
        it.on('error', resolve);
      })).resolves.toThrow(new Error('Received metadata AFTER the source iterator was ended.'));
    });

    it('calling _read while already iterating should not do anything', () => {
      const data = [[
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]];
      const quads = toTerms(data);
      const it = new Dummy(quads, null, null, null, null, 'first');
      jest.spyOn(<any> it, 'getNextUrls');
      (<any> it).started = true;
      (<any> it).iterating = true;
      (<any> it)._read(1, () => { return; });
      expect((<any> it).getNextUrls).not.toHaveBeenCalled();
    });

    it('delegates error events from the source', async () => {
      const it = new DummyError([[], []], null, null, null, null, 'first');
      expect(await new Promise((resolve, reject) => {
        it.on('error', resolve);
        it.on('end', reject);
        it.on('data', () => {}); // tslint:disable-line no-empty
      })).toEqual(new Error('Emitted error!'));
    });
  });
});

function toTerms(data) {
  return data.map((page) => page.map((terms) => lit.call(null, terms)));
}

function flatten(a) {
  return [].concat.apply([], a);
}
