import {defaultGraph, namedNode, variable} from "@rdfjs/data-model";
import "jest-rdf";
import {Store as N3Store} from "n3";
import {N3StoreIterator} from "../lib/N3StoreIterator";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('N3StoreIterator', () => {
  let store;

  beforeEach(() => {
    store = new N3Store([
      quad('s1', 'p1', 'o1'),
      quad('s1', 'p1', 'o2'),
      quad('s1', 'p2', 'o1'),
      quad('s1', 'p2', 'o2'),
      quad('s2', 'p1', 'o1'),
      quad('s2', 'p1', 'o2'),
      quad('s2', 'p2', 'o1'),
      quad('s2', 'p2', 'o2'),
    ]);
  });

  it('should be instantiatable', () => {
    return expect(() => new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), namedNode('o1'))).not.toThrow();
  });

  it('should return the correct stream for ? ? ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), variable('p'), variable('o'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
        quad('s1', 'p2', 'o1'),
        quad('s1', 'p2', 'o2'),
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
        quad('s2', 'p2', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
  });

  it('should return the correct stream for s1 ? ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), variable('p'), variable('o'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
        quad('s1', 'p2', 'o1'),
        quad('s1', 'p2', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), namedNode('p1'), variable('o'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
        quad('s2', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for s1 p1 ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), variable('o'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 o1', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), namedNode('p1'), namedNode('o1'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p1', 'o1'),
      ]);
  });

  it('should return the correct stream for s1 p1 o1', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), namedNode('o1'),
      defaultGraph()))).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
      ]);
  });
});
