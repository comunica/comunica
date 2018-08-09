import {namedNode, variable} from "@rdfjs/data-model";
import {HdtIterator} from "../lib/HdtIterator";
import {MockedHdtDocument} from "../mocks/MockedHdtDocument";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('HdtIterator', () => {
  let hdtDocument;

  beforeEach(() => {
    hdtDocument = new MockedHdtDocument([
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
    return expect(() => new HdtIterator(hdtDocument, namedNode('s1'), namedNode('p1'), namedNode('o1'),
      { offset: 0, limit: 10 })).not.toThrow();
  });

  it('should return the correct stream for ? ? ?', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      {}))).toEqual([
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

  it('should return the correct stream for ? ? ? with offset 3', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      { offset : 3 }))).toEqual([
        quad('s1', 'p2', 'o2'),
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
        quad('s2', 'p2', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
  });

  it('should return the correct stream for ? ? ? with offset 7', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      { offset : 7 }))).toEqual([
        quad('s2', 'p2', 'o2'),
      ]);
  });

  it('should return the correct stream for ? ? ? with offset 8', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      { offset : 8 }))).toEqual([]);
  });

  it('should return the correct stream for ? ? ? with offset 9', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      { offset : 9 }))).toEqual([]);
  });

  it('should return the correct stream for s1 ? ?', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, namedNode('s1'), variable('p'), variable('o'),
      {}))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
        quad('s1', 'p2', 'o1'),
        quad('s1', 'p2', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 ?', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), namedNode('p1'), variable('o'),
      {}))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for s1 p1 ?', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, namedNode('s1'), namedNode('p1'), variable('o'),
      {}))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? p1 o1', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), namedNode('p1'), namedNode('o1'),
      {}))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p1', 'o1'),
      ]);
  });

  it('should return the correct stream for s1 p1 o1', async () => {
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, namedNode('s1'), namedNode('p1'), namedNode('o1'),
      {}))).toEqual([
        quad('s1', 'p1', 'o1'),
      ]);
  });

  it('should not return anything when the document is closed', async () => {
    hdtDocument.close();
    return expect(await arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      {}))).toEqual([]);
  });

  it('should resolve to an error if the document emits an error', async () => {
    const e = new Error();
    hdtDocument.setError(e);
    return expect(arrayifyStream(new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should fill its buffer when a totalItems listener is attached', async () => {
    const it = new HdtIterator(hdtDocument, variable('s'), variable('p'), variable('o'));
    it.on('totalItems', (i) => {
      expect(i).toEqual(8);
    });
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
