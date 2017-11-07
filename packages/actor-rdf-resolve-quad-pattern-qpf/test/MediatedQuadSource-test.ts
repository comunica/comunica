import * as RDF from "rdf-js";
import {Readable} from "stream";
import {MediatedQuadSource} from "../lib/MediatedQuadSource";

describe('MediatedQuadSource', () => {
  let mediator;
  let uriConstructor;
  let S;
  let P;
  let O;
  let G;

  beforeEach(() => {
    mediator = {};
    mediator.mediate = (action) => Promise.resolve({
      data: stream([ action.url + '/a', action.url + '/b', action.url + '/c' ]),
      firstPageMetadata: 'somemetadata',
    });
    uriConstructor = (s, p, o, g) => s.value + ',' + p.value + ',' + o.value + ',' + g.value;
    S = { value: 'S' };
    P = { value: 'P' };
    O = { value: 'O' };
    G = { value: 'G' };
  });

  describe('The MediatedQuadSource module', () => {
    it('should be a function', () => {
      expect(MediatedQuadSource).toBeInstanceOf(Function);
    });

    it('should be a MediatedQuadSource constructor', () => {
      expect(new MediatedQuadSource(mediator, uriConstructor)).toBeInstanceOf(MediatedQuadSource);
    });
  });

  describe('A MediatedQuadSource instance', () => {
    let source: MediatedQuadSource;

    beforeEach(() => {
      source = new MediatedQuadSource(mediator, uriConstructor);
    });

    it('should throw an error on a subject regex call', () => {
      return expect(() => source.match(/.*/)).toThrow();
    });

    it('should throw an error on a predicate regex call', () => {
      return expect(() => source.match(null, /.*/)).toThrow();
    });

    it('should throw an error on a object regex call', () => {
      return expect(() => source.match(null, null, /.*/)).toThrow();
    });

    it('should throw an error on a graph regex call', () => {
      return expect(() => source.match(null, null, null, /.*/)).toThrow();
    });

    it('should return the mediated stream', () => {
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        const list = [];
        output.on('data', (e) => list.push(e));
        output.on('error', reject);
        output.on('end', () => {
          if (list.length !== 3) {
            reject();
          } else {
            expect(list).toEqual([ 'S,P,O,G/a', 'S,P,O,G/b', 'S,P,O,G/c' ]);
            resolve();
          }
        });
      });
    });

    it('should return the mediated metadata', () => {
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('metadata', (metadata) => {
          expect(metadata).toEqual('somemetadata');
          resolve();
        });
        output.on('error', reject);
        output.on('end', reject);
      });
    });

    it('should delegate promise rejections', () => {
      const error = new Error('a');
      mediator.mediate = (action) => Promise.reject(error);
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('data', () => ({}));
        output.on('error', (e) => {
          expect(e).toEqual(error);
          resolve();
        });
        output.on('end', reject);
      });
    });

    it('should delegate errors', () => {
      const data = stream([ 'a', 'b' ]);
      mediator.mediate = (action) => Promise.resolve({ data });
      const error = new Error('a');
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('data', () => {
          data.emit('error', error);
          return;
        });
        output.on('error', (e) => {
          expect(e).toEqual(error);
          resolve();
        });
        output.on('end', reject);
      });
    });
  });
});

function stream(elements) {
  const readable = new Readable({ objectMode: true });
  readable._read = () => {
    readable.push(elements.shift());
    if (elements.length === 0) {
      readable.push(null);
    }
  };
  return readable;
}
