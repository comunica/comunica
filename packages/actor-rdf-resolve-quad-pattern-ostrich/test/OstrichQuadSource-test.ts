import {namedNode, quad, variable} from "rdf-data-model";
import {OstrichIterator} from "../lib/OstrichIterator";
import {OstrichQuadSource} from "../lib/OstrichQuadSource";
import {MockedOstrichDocument} from "../mocks/MockedOstrichDocument";

describe('OstrichQuadSource', () => {
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

  describe('The OstrichQuadSource module', () => {
    it('should be a function', () => {
      expect(OstrichQuadSource).toBeInstanceOf(Function);
    });

    it('should be a OstrichQuadSource constructor', () => {
      expect(new OstrichQuadSource(ostrichDocument)).toBeInstanceOf(OstrichQuadSource);
    });
  });

  describe('A OstrichQuadSource instance', () => {
    let source: OstrichQuadSource;

    beforeEach(() => {
      source = new OstrichQuadSource(ostrichDocument);
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

    it('should throw an error when queried on the non-default graph', () => {
      return expect(() => source.match(null, null, null, namedNode('http://ex.org'))).toThrow();
    });

    it('should return a OstrichIterator', () => {
      source.setVersionContext({ type: 'version-materialization', version: 0 });
      return expect(source.match(variable('v'), variable('v'), variable('v'))).toBeInstanceOf(OstrichIterator);
    });

    it('should return a OstrichIterator', () => {
      source.setVersionContext({ type: 'version-materialization', version: 0 });
      return expect(source.match(variable('v'), variable('v'), variable('v'))).toBeInstanceOf(OstrichIterator);
    });

    it('should count VM', () => {
      source.setVersionContext({ type: 'version-materialization', version: 0 });
      return expect(source.count(variable('v'), variable('v'), variable('v'))).resolves.toBe(2);
    });

    it('should count DM', () => {
      source.setVersionContext({ type: 'delta-materialization', versionStart: 0, versionEnd: 1 });
      return expect(source.count(variable('v'), variable('v'), variable('v'))).resolves.toBe(4);
    });

    it('should count VQ', () => {
      source.setVersionContext({ type: 'version-query' });
      return expect(source.count(variable('v'), variable('v'), variable('v'))).resolves.toBe(8);
    });

    it('should delegate count errors', () => {
      source.setVersionContext({ type: 'version-query' });
      ostrichDocument.countTriplesVersion = (s, p, o, done) => {
        done(new Error('e'));
      };
      return expect(source.count(variable('v'), variable('v'), variable('v'))).rejects.toEqual(new Error('e'));
    });
  });
});

function t(subject, predicate, object) {
  return { subject, predicate, object };
}
