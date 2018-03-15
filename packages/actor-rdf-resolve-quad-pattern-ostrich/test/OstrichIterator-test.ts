import {blankNode, defaultGraph, literal, namedNode, variable} from "rdf-data-model";
import {VersionContext} from "../lib/ActorRdfResolveQuadPatternOstrich";
import {OstrichIterator} from "../lib/OstrichIterator";
import {MockedOstrichDocument} from "../mocks/MockedOstrichDocument";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('OstrichIterator', () => {
  const vm0: VersionContext = { type: 'version-materialization', version: 0 };
  const dm01: VersionContext = { type: 'delta-materialization', versionStart: 0, versionEnd: 1 };
  const dm23: VersionContext = { type: 'delta-materialization', versionStart: 2, versionEnd: 3 };
  const vq: VersionContext = { type: 'version-query' };
  let ostrichDocument;

  beforeEach(() => {
    ostrichDocument = new MockedOstrichDocument({
      0: [
        t('s0', 'p1', 'o1'),
        t('s0', 'p1', 'o2'),
      ],
      1: [
        t('s1', 'p1', 'o1'),
        t('s1', 'p1', 'o2'),
      ],
      2: [
        t('s2', 'p1', 'o1'),
        t('s2', 'p1', 'o2'),
      ],
      3: [
        t('s2', 'p1', 'o1'),
        t('s2', 'p1', 'o2'),
      ],
    });
  });

  it('should be instantiatable', () => {
    return expect(() => new OstrichIterator(ostrichDocument, vm0, namedNode('s1'), namedNode('p1'), namedNode('o1'),
      { offset: 0, limit: 10 })).not.toThrow();
  });

  it('should return the correct stream for ? ? ? VM 0', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, vm0, variable('s'), variable('p'),
      variable('o'), {}))).toEqual([
        quad('s0', 'p1', 'o1'),
        quad('s0', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? ? ? DM 0-1', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, dm01, variable('s'), variable('p'),
      variable('o'), {}))).toEqual([
        quad('s0', 'p1', 'o1'),
        quad('s0', 'p1', 'o2'),
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for s0 ? ? DM 0-1', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, dm01, namedNode('s0'), variable('p'),
      variable('o'), {}))).toEqual([
        quad('s0', 'p1', 'o1'),
        quad('s0', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for s1 ? ? DM 0-1', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, dm01, namedNode('s1'), variable('p'),
      variable('o'), {}))).toEqual([
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ]);
  });

  it('should return the correct stream for ? ? ? DM 2-3', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, dm23, variable('s'), variable('p'),
      variable('o'), {}))).toEqual([]);
  });

  it('should return the correct stream for s0 VQ', async () => {
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, vq, namedNode('s0'), variable('p'),
      variable('o'), {}))).toEqual([
        quad('s0', 'p1', 'o1'),
        quad('s0', 'p1', 'o2'),
      ]);
  });

  it('should not return anything when the document is closed', async () => {
    ostrichDocument.close();
    return expect(await arrayifyStream(new OstrichIterator(ostrichDocument, vq, variable('s'), variable('p'),
      variable('o'), {}))).toEqual([]);
  });

  it('should resolve to an error if the document emits an error in VM', async () => {
    const e = new Error();
    ostrichDocument.setError(e);
    return expect(arrayifyStream(new OstrichIterator(ostrichDocument, vm0, variable('s'), variable('p'), variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should resolve to an error if the document emits an error in DM', async () => {
    const e = new Error();
    ostrichDocument.setError(e);
    return expect(arrayifyStream(new OstrichIterator(ostrichDocument, dm01, variable('s'), variable('p'), variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should resolve to an error if the document emits an error in VQ', async () => {
    const e = new Error();
    ostrichDocument.setError(e);
    return expect(arrayifyStream(new OstrichIterator(ostrichDocument, vq, variable('s'), variable('p'), variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should only call query once', async () => {
    const iterator = new OstrichIterator(ostrichDocument, vm0, variable('s'), variable('p'), variable('o'), {});
    const spy = jest.spyOn(ostrichDocument, 'searchTriplesVersionMaterialized');
    iterator._read(1, () => { return; });
    iterator._read(1, () => { return; });
    return expect(spy).toHaveBeenCalledTimes(1);
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
