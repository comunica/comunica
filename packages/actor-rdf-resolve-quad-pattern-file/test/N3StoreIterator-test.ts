import {blankNode, defaultGraph, literal, namedNode, variable} from "rdf-data-model";
import {N3StoreIterator} from "../lib/N3StoreIterator";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const N3Store = require('n3').Store;

describe('N3StoreIterator', () => {
  let store;

  beforeEach(() => {
    store = new N3Store([
      t('s1', 'p1', 'o1'),
      t('s1', 'p1', 'o2'),
      t('s1', 'p2', 'o1'),
      t('s1', 'p2', 'o2'),
      t('s2', 'p1', 'o1'),
      t('s2', 'p1', 'o2'),
      t('s2', 'p2', 'o1'),
      t('s2', 'p2', 'o2'),
    ]);
  });

  it('should be instantiatable', () => {
    return expect(() => new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), namedNode('o1'))).not.toThrow();
  });

  it('should return the correct stream for ? ? ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), variable('p'), variable('o'),
      defaultGraph()))).toEqual([
        quad('s2', 'p2', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
        quad('s1', 'p2', 'o1'),
        quad('s1', 'p2', 'o2'),
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for s1 ? ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), variable('p'), variable('o'),
      defaultGraph()))).toEqual([
        quad('s1', 'p2', 'o1'),
        quad('s1', 'p2', 'o2'),
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), namedNode('p1'), variable('o'),
      defaultGraph()))).toEqual([
        quad('s1', 'p1', 'o2'),
        quad('s2', 'p1', 'o2'),
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p1', 'o1'),
      ]);
  });

  it('should return the correct stream for s1 p1 ?', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), variable('o'),
      defaultGraph()))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 o1', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, variable('s'), namedNode('p1'), namedNode('o1'),
      defaultGraph()))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p1', 'o1'),
      ]);
  });

  it('should return the correct stream for s1 p1 o1', async () => {
    return expect(await arrayifyStream(new N3StoreIterator(store, namedNode('s1'), namedNode('p1'), namedNode('o1'),
      defaultGraph()))).toEqual([
        quad('s1', 'p1', 'o1'),
      ]);
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
