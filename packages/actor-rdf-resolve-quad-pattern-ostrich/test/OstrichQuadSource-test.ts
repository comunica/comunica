import {namedNode, quad, variable} from "rdf-data-model";
import {OstrichIterator} from "../lib/OstrichIterator";
import {OstrichQuadSource} from "../lib/OstrichQuadSource";
import {MockedOstrichDocument} from "../mocks/MockedOstrichDocument";

describe('OstrichQuadSource', () => {
  let ostrichDocument;

  beforeEach(() => {
    ostrichDocument = new MockedOstrichDocument([]);
  });

  describe('The OstrichQuadSource module', () => {
    it('should be a function', () => {
      expect(OstrichQuadSource).toBeInstanceOf(Function);
    });

    it('should be a OstrichQuadSource constructor', () => {
      expect(new OstrichQuadSource(ostrichDocument)).toBeInstanceOf(OstrichQuadSource);
    });

    it('should be a OstrichQuadSource constructor with optional bufferSize argument', () => {
      expect(new OstrichQuadSource(ostrichDocument, 10)).toBeInstanceOf(OstrichQuadSource);
    });
  });

  describe('A OstrichQuadSource instance', () => {
    let source: OstrichQuadSource;

    beforeEach(() => {
      source = new OstrichQuadSource(ostrichDocument, 10);
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
  });
});
