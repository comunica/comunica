import { variable } from '@rdfjs/data-model';
import { Store as N3Store } from 'n3';
import { N3StoreIterator } from '../lib/N3StoreIterator';
import { N3StoreQuadSource } from '../lib/N3StoreQuadSource';

describe('N3StoreQuadSource', () => {
  let store: any;

  beforeEach(() => {
    store = new N3Store([]);
  });

  describe('The N3StoreQuadSource module', () => {
    it('should be a function', () => {
      expect(N3StoreQuadSource).toBeInstanceOf(Function);
    });

    it('should be a N3StoreQuadSource constructor', () => {
      expect(new N3StoreQuadSource(store)).toBeInstanceOf(N3StoreQuadSource);
    });
  });

  describe('A N3StoreQuadSource instance', () => {
    let source: N3StoreQuadSource;

    beforeEach(() => {
      source = new N3StoreQuadSource(store);
    });

    it('should throw an error on a subject regex call', () => {
      return expect(() => source.match(/.*/u)).toThrow();
    });

    it('should throw an error on a predicate regex call', () => {
      return expect(() => source.match(undefined, /.*/u)).toThrow();
    });

    it('should throw an error on a object regex call', () => {
      return expect(() => source.match(undefined, undefined, /.*/u)).toThrow();
    });

    it('should throw an error on a graph regex call', () => {
      return expect(() => source.match(undefined, undefined, undefined, /.*/u)).toThrow();
    });

    it('should return a N3StoreIterator', () => {
      return expect(source.match(variable('v'), variable('v'), variable('v'))).toBeInstanceOf(N3StoreIterator);
    });
  });
});
