import { Store as N3Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import { N3StoreIterator } from '../lib/N3StoreIterator';
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const DF = new DataFactory();

describe('N3StoreIterator', () => {
  let store: any;

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
    return expect(() => new N3StoreIterator(store,
      DF.namedNode('s1'),
      DF.namedNode('p1'),
      DF.namedNode('o1'))).not.toThrow();
  });

  it('should return the correct stream for ? ? ?', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
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

  it('should return the correct stream for s1 ? ?', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.namedNode('s1'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
      quad('s1', 'p1', 'o1'),
      quad('s1', 'p1', 'o2'),
      quad('s1', 'p2', 'o1'),
      quad('s1', 'p2', 'o2'),
    ]);
  });

  it('should return the correct stream for ? p1 ?', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.variable('s'), DF.namedNode('p1'), DF.variable('o'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
      quad('s1', 'p1', 'o1'),
      quad('s2', 'p1', 'o1'),
      quad('s1', 'p1', 'o2'),
      quad('s2', 'p1', 'o2'),
    ]);
  });

  it('should return the correct stream for s1 p1 ?', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.namedNode('s1'), DF.namedNode('p1'), DF.variable('o'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
      quad('s1', 'p1', 'o1'),
      quad('s1', 'p1', 'o2'),
    ]);
  });

  it('should return the correct stream for ? p1 o1', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.variable('s'), DF.namedNode('p1'), DF.namedNode('o1'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
      quad('s1', 'p1', 'o1'),
      quad('s2', 'p1', 'o1'),
    ]);
  });

  it('should return the correct stream for s1 p1 o1', async() => {
    expect(await arrayifyStream(
      new N3StoreIterator(store, DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.defaultGraph()),
    )).toEqualRdfQuadArray([
      quad('s1', 'p1', 'o1'),
    ]);
  });
});
