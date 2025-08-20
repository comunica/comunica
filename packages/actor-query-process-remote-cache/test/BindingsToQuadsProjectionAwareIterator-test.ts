import type { ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { bindTemplateWithProjection, bindTermProjectionAware, bindQuadProjectionAware } from '../lib/bindTemplateWithProjection';
import 'jest-rdf';

const RDF_FACTORY: ComunicaDataFactory = new DataFactory();
const BF = new BindingsFactory(RDF_FACTORY);

describe(bindTemplateWithProjection.name, () => {
  describe(bindTermProjectionAware.name, () => {
    it('should the term is not a variable should return undefined', () => {
      const aTerm = RDF_FACTORY.namedNode('a');
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', RDF_FACTORY.blankNode() ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedValue = bindTermProjectionAware(bindings, aTerm, unprojectedValueMap);
      expect(bindedValue).toStrictEqual(aTerm);
    });

    it('should return a term given a variable in the binding', () => {
      const aTerm = RDF_FACTORY.variable('a');
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', RDF_FACTORY.blankNode() ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedValue = bindTermProjectionAware(bindings, aTerm, unprojectedValueMap);
      expect(bindedValue).toStrictEqual(RDF_FACTORY.namedNode('a'));
    });

    it('should return a blank node given an unprojected variable', () => {
      const aTerm = RDF_FACTORY.variable('c');
      const expectedBlankNode = RDF_FACTORY.blankNode();
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', expectedBlankNode ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedValue = bindTermProjectionAware(bindings, aTerm, unprojectedValueMap);
      expect(bindedValue).toStrictEqual(expectedBlankNode);
    });
  });

  describe(bindQuadProjectionAware.name, () => {
    it('should return undefined given a non-matching pattern', () => {
      const pattern: RDF.BaseQuad = RDF_FACTORY.quad(RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2'));
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', RDF_FACTORY.blankNode() ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedQuad = bindQuadProjectionAware(bindings, unprojectedValueMap, pattern);
      expect(bindedQuad).toBeUndefined();
    });

    it('should return a quad given a matching pattern', () => {
      const pattern: RDF.BaseQuad = RDF_FACTORY.quad(RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2'));
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', RDF_FACTORY.blankNode() ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedQuad = bindQuadProjectionAware(bindings, unprojectedValueMap, pattern);
      expect(bindedQuad).toEqualRdfQuad(
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
      );
    });

    it('should return a quad given an unprojected matching pattern', () => {
      const pattern: RDF.BaseQuad = RDF_FACTORY.quad(RDF_FACTORY.variable('c'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2'));
      const expectedBlankNode = RDF_FACTORY.blankNode();
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', expectedBlankNode ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedQuad = bindQuadProjectionAware(bindings, unprojectedValueMap, pattern);
      expect(bindedQuad).toEqualRdfQuad(
        RDF_FACTORY.quad(expectedBlankNode, RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
      );
    });

    it('should return a quad given an unprojected and a projected matching pattern', () => {
      const pattern: RDF.BaseQuad = RDF_FACTORY.quad(RDF_FACTORY.variable('c'), RDF_FACTORY.variable('a'), RDF_FACTORY.variable('aa'));
      const expectedBlankNode = RDF_FACTORY.blankNode();
      const unprojectedValueMap: Map<string, RDF.BlankNode> = new Map([
        [ 'c', expectedBlankNode ],
        [ 'd', RDF_FACTORY.blankNode() ],
      ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('a') ],
        [ RDF_FACTORY.variable('aa'), RDF_FACTORY.namedNode('aa') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const bindedQuad = bindQuadProjectionAware(bindings, unprojectedValueMap, pattern);
      expect(bindedQuad).toEqualRdfQuad(
        RDF_FACTORY.quad(expectedBlankNode, RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('aa')),
      );
    });
  });

  describe(bindTemplateWithProjection, () => {
    it('should return no quads given an unrelated template', () => {
      const patterns: RDF.BaseQuad[] = [
        RDF_FACTORY.quad(RDF_FACTORY.variable('unrelated'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('unrelated2'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ];
      const unprojectedValueMap: Set<string> = new Set([ 'a', 'aa' ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('b') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const quads = bindTemplateWithProjection(RDF_FACTORY, bindings, patterns, 0, unprojectedValueMap);

      expect(quads).toStrictEqual([]);
    });

    it('should return quads given a template related to the binding', () => {
      const patterns: RDF.BaseQuad[] = [
        RDF_FACTORY.quad(RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ];
      const unprojectedValueMap: Set<string> = new Set([ 'a', 'aa' ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('b') ],
        [ RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('bb') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const quads = bindTemplateWithProjection(RDF_FACTORY, bindings, patterns, 0, unprojectedValueMap);

      expect(quads).toBeRdfIsomorphic([
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('b'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('bb'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ]);
    });

    it('should return quads given a template partially related to the binding', () => {
      const patterns: RDF.BaseQuad[] = [
        RDF_FACTORY.quad(RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('c'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ];
      const unprojectedValueMap: Set<string> = new Set([ 'a', 'aa' ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('b') ],
        [ RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('bb') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const quads = bindTemplateWithProjection(RDF_FACTORY, bindings, patterns, 0, unprojectedValueMap);

      expect(quads).toBeRdfIsomorphic([
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('b'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('bb'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ]);
    });

    it('should return quads given a template related to the unprojected variables', () => {
      const patterns: RDF.BaseQuad[] = [
        RDF_FACTORY.quad(RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('aa'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ];
      const unprojectedValueMap: Set<string> = new Set([ 'a', 'aa' ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('b') ],
        [ RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('bb') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const quads = bindTemplateWithProjection(RDF_FACTORY, bindings, patterns, 0, unprojectedValueMap);

      expect(quads).toBeRdfIsomorphic([
        RDF_FACTORY.quad(RDF_FACTORY.blankNode(), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.blankNode(), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ]);
    });

    it('should return quads given a template related to the unprojected and projected variables', () => {
      const patterns: RDF.BaseQuad[] = [
        RDF_FACTORY.quad(RDF_FACTORY.variable('a'), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ];
      const unprojectedValueMap: Set<string> = new Set([ 'a', 'aa' ]);
      const bindingRaw: [RDF.Variable, RDF.Term][] = [
        [ RDF_FACTORY.variable('b'), RDF_FACTORY.namedNode('b') ],
        [ RDF_FACTORY.variable('bb'), RDF_FACTORY.namedNode('bb') ],
      ];
      const bindings = BF.bindings(bindingRaw);

      const quads = bindTemplateWithProjection(RDF_FACTORY, bindings, patterns, 0, unprojectedValueMap);

      expect(quads).toBeRdfIsomorphic([
        RDF_FACTORY.quad(RDF_FACTORY.blankNode(), RDF_FACTORY.namedNode('IRI'), RDF_FACTORY.namedNode('IRI2')),
        RDF_FACTORY.quad(RDF_FACTORY.namedNode('b'), RDF_FACTORY.namedNode('a'), RDF_FACTORY.namedNode('b')),
      ]);
    });
  });
});
