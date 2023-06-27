import type { IActionRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { BlankNodeScoped } from '@comunica/data-factory';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import Factory from 'sparqlalgebrajs/lib/factory';
import { FederatedQuadSource } from '../lib/FederatedQuadSource';

const squad = require('rdf-quad');

const factory = new Factory();
const DF = new DataFactory<RDF.BaseQuad>();

const v = DF.variable('v');

describe('FederatedQuadSource', () => {
  let mediatorResolveQuadPattern: any;
  let mediatorRdfMetadataAccumulate: any;
  let context: IActionContext;
  let returnedIterators: AsyncIterator<any>[];

  beforeEach(() => {
    returnedIterators = [];
    mediatorResolveQuadPattern = {
      mediate(action: any) {
        const type = action.context.get(KeysRdfResolveQuadPattern.source).type;
        if (type === 'emptySource') {
          const data = new ArrayIterator([], { autoStart: false });
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 0 },
            canContainUndefs: false,
          });
          return Promise.resolve({ data });
        }
        if (type === 'nonEmptySourceNoMeta') {
          const data = new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ], { autoStart: false });
          data.setProperty('metadata', {});
          return Promise.resolve({ data });
        }
        if (type === 'nonEmptySourceInfMeta') {
          const data = new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ], { autoStart: false });
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          });
          return Promise.resolve({ data });
        }
        if (type === 'blankNodeSource') {
          const data = new ArrayIterator([
            squad('_:s1', '_:p1', '_:o1'),
            squad('_:s2', '_:p2', '_:o2'),
          ], { autoStart: false });
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          });
          return Promise.resolve({ data });
        }
        if (type === 'errorSource') {
          const data = new ArrayIterator([], { autoStart: false });
          let ran = false;
          (<any>data).read = () => {
            if (ran) {
              return null;
            }
            ran = true;
            data.emit('error', new Error('FederatedQuadSource: errorSource'));
            return squad('_:s1', '_:p1', '_:o1');
          };
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          });
          return Promise.resolve({ data });
        }
        if (type === 'graphs') {
          const data = new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
            squad('s2', 'p1', 'o1', 'g1'),
            squad('s2', 'p1', 'o2', 'g1'),
            squad('s3', 'p1', 'o1', 'g2'),
            squad('s3', 'p1', 'o2', 'g2'),
          ], { autoStart: false });
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 6 },
            canContainUndefs: false,
          });
          return Promise.resolve({ data });
        }
        if (type === 'nonEmptySourceUndefs') {
          const data = new ArrayIterator([
            squad('s1', 'p1', 'o1'),
            squad('s1', 'p1', 'o2'),
          ], { autoStart: false });
          data.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 2 },
            canContainUndefs: true,
          });
          return Promise.resolve({ data });
        }
        const data = new ArrayIterator([
          squad('s1', 'p1', 'o1'),
          squad('s1', 'p1', 'o2'),
        ], { autoStart: false });
        data.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: false,
          otherMetadata: true,
        });
        jest.spyOn(data, 'destroy');
        returnedIterators.push(data);
        return Promise.resolve({ data });
      },
    };
    mediatorRdfMetadataAccumulate = <any> {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }, canContainUndefs: false }};
        }

        const metadata = { ...action.accumulatedMetadata };
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
          // We're already at infinite, so ignore any later metadata
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        } else {
          if (subMetadata.cardinality.type === 'estimate') {
            metadata.cardinality.type = 'estimate';
          }
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        if (metadata.requestTime || subMetadata.requestTime) {
          metadata.requestTime = metadata.requestTime || 0;
          subMetadata.requestTime = subMetadata.requestTime || 0;
          metadata.requestTime += subMetadata.requestTime;
        }
        if (metadata.pageSize || subMetadata.pageSize) {
          metadata.pageSize = metadata.pageSize || 0;
          subMetadata.pageSize = subMetadata.pageSize || 0;
          metadata.pageSize += subMetadata.pageSize;
        }
        if (subMetadata.canContainUndefs) {
          metadata.canContainUndefs = true;
        }

        return { metadata };
      },
    };
    context = new ActionContext({
      [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'myType', value: 'myValue' }],
    });
  });

  describe('The FederatedQuadSource module', () => {
    it('should be a function', () => {
      expect(FederatedQuadSource).toBeInstanceOf(Function);
    });

    it('should be a FederatedQuadSource constructor', () => {
      expect(new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        context,
        new Map(),
        true,
      )).toBeInstanceOf(FederatedQuadSource);
    });

    it('should be a FederatedQuadSource constructor with optional bufferSize argument', () => {
      expect(new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        context,
        new Map(),
        true,
      )).toBeInstanceOf(FederatedQuadSource);
    });
  });

  describe('#skolemizeTerm', () => {
    it('should not change a variable', () => {
      expect(FederatedQuadSource.skolemizeTerm(DF.variable('abc'), '0'))
        .toEqualRdfTerm(DF.variable('abc'));
    });

    it('should not change a named node', () => {
      expect(FederatedQuadSource.skolemizeTerm(DF.namedNode('abc'), '0'))
        .toEqualRdfTerm(DF.namedNode('abc'));
    });

    it('should not change a literal', () => {
      expect(FederatedQuadSource.skolemizeTerm(DF.literal('abc'), '0'))
        .toEqualRdfTerm(DF.literal('abc'));
    });

    it('should not change a default graph', () => {
      expect(FederatedQuadSource.skolemizeTerm(DF.defaultGraph(), '0'))
        .toEqualRdfTerm(DF.defaultGraph());
    });

    it('should change a blank node', () => {
      expect(FederatedQuadSource.skolemizeTerm(DF.blankNode('abc'), '0'))
        .toEqualRdfTerm(DF.blankNode('urn:comunica_skolem:source_0:abc'));
      expect((<BlankNodeScoped>FederatedQuadSource.skolemizeTerm(DF.blankNode('abc'), '0')).skolemized)
        .toEqualRdfTerm(DF.namedNode('urn:comunica_skolem:source_0:abc'));
    });
  });

  describe('#skolemizeQuad', () => {
    it('should not skolemize named nodes', () => {
      expect(FederatedQuadSource.skolemizeQuad(
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('g')), '0',
      ))
        .toEqual(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('g')));
    });

    it('should skolemize blank nodes', () => {
      expect(FederatedQuadSource.skolemizeQuad(
        DF.quad(DF.blankNode('s'), DF.blankNode('p'), DF.blankNode('o'), DF.blankNode('g')), '0',
      ))
        .toEqual(DF.quad(
          new BlankNodeScoped('bc_0_s', DF.namedNode('urn:comunica_skolem:source_0:s')),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
          new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
          new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
        ));
    });

    it('should skolemize blank nodes in quoted triples', () => {
      expect(FederatedQuadSource.skolemizeQuad(
        DF.quad(
          DF.quad(DF.blankNode('s'), DF.blankNode('p'), DF.blankNode('o'), DF.blankNode('g')),
          DF.blankNode('p'),
          DF.blankNode('o'),
          DF.blankNode('g'),
        ), '0',
      ))
        .toEqual(DF.quad(
          DF.quad(
            new BlankNodeScoped('bc_0_s', DF.namedNode('urn:comunica_skolem:source_0:s')),
            new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
            new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
            new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
          ),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
          new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
          new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
        ));
    });
  });

  describe('#deskolemizeQuad', () => {
    it('should not skolemize named nodes', () => {
      expect(FederatedQuadSource.deskolemizeQuad(
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('g')), '0',
      ))
        .toEqual(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('g')));
    });

    it('should deskolemize blank nodes with the right id', () => {
      expect(FederatedQuadSource.deskolemizeQuad(
        DF.quad(
          new BlankNodeScoped('bc_0_s', DF.namedNode('urn:comunica_skolem:source_0:s')),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
          new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
          new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
        ), '0',
      )).toEqual(DF.quad(
        DF.blankNode('s'),
        DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ));
    });

    it('should deskolemize blank nodes in quoted triples with the right id', () => {
      expect(FederatedQuadSource.deskolemizeQuad(
        DF.quad(
          DF.quad(
            new BlankNodeScoped('bc_0_s', DF.namedNode('urn:comunica_skolem:source_0:s')),
            new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
            new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
            new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
          ),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_0:p')),
          new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
          new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
        ), '0',
      )).toEqual(DF.quad(
        DF.quad(
          DF.blankNode('s'),
          DF.blankNode('p'),
          DF.blankNode('o'),
          DF.blankNode('g'),
        ),
        DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ));
    });

    it('should deskolemize blank nodes with the right id but not ones with the wrong id', () => {
      expect(FederatedQuadSource.deskolemizeQuad(
        DF.quad(
          new BlankNodeScoped('bc_0_s', DF.namedNode('urn:comunica_skolem:source_0:s')),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_1:p')),
          new BlankNodeScoped('bc_0_o', DF.namedNode('urn:comunica_skolem:source_0:o')),
          new BlankNodeScoped('bc_0_g', DF.namedNode('urn:comunica_skolem:source_0:g')),
        ), '0',
      )).toEqual(
        DF.quad(
          DF.blankNode('s'),
          new BlankNodeScoped('bc_0_p', DF.namedNode('urn:comunica_skolem:source_1:p')),
          DF.blankNode('o'),
          DF.blankNode('g'),
        ),
      );
    });

    it('should deskolemize named nodes with the right id but not ones with the wrong id', () => {
      expect(FederatedQuadSource.deskolemizeQuad(
        DF.quad(
          DF.namedNode('urn:comunica_skolem:source_0:s'),
          DF.namedNode('urn:comunica_skolem:source_1:p'),
          DF.namedNode('urn:comunica_skolem:source_0:o'),
          DF.namedNode('urn:comunica_skolem:source_0:g'),
        ), '0',
      )).toEqual(
        DF.quad(
          DF.blankNode('s'),
          DF.namedNode('urn:comunica_skolem:source_1:p'),
          DF.blankNode('o'),
          DF.blankNode('g'),
        ),
      );
    });
  });

  describe('#deskolemizeTerm', () => {
    it('should not change a variable', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.variable('abc'), '0'))
        .toEqual(DF.variable('abc'));
    });

    it('should not change a non-skolemized named node', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.namedNode('abc'), '0'))
        .toEqual(DF.namedNode('abc'));
    });

    it('should not change a literal', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.literal('abc'), '0'))
        .toEqual(DF.literal('abc'));
    });

    it('should not change a default graph', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.defaultGraph(), '0'))
        .toEqual(DF.defaultGraph());
    });

    it('should not change a plain blank node', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.blankNode('abc'), '0'))
        .toEqual(DF.blankNode('abc'));
    });

    it('should change a skolemized blank node in the proper source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_0:abc')), '0'))
        .toEqual(DF.blankNode('abc'));
    });

    it('should change a skolemized named node in the proper source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(DF.namedNode('urn:comunica_skolem:source_0:abc'), '0'))
        .toEqual(DF.blankNode('abc'));
    });

    it('should change a skolemized blank node in the wrong source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_0:abc')), '1'))
        .toBeFalsy();
    });

    it('should change a skolemized named node in the wrong source', () => {
      expect(FederatedQuadSource.deskolemizeTerm(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_0:abc')), '1'))
        .toBeFalsy();
    });
  });

  describe('#isTermBound', () => {
    it('should be false on a variable', () => {
      return expect(FederatedQuadSource.isTermBound(DF.variable('var'))).toBeFalsy();
    });

    it('should be true on a blank node', () => {
      return expect(FederatedQuadSource.isTermBound(DF.blankNode('bnode'))).toBeTruthy();
    });

    it('should be true on a named node', () => {
      return expect(FederatedQuadSource.isTermBound(DF.namedNode('http://example.org'))).toBeTruthy();
    });

    it('should be true on a literal', () => {
      return expect(FederatedQuadSource.isTermBound(DF.literal('lit'))).toBeTruthy();
    });

    it('should be true on the default graph', () => {
      return expect(FederatedQuadSource.isTermBound(DF.defaultGraph())).toBeTruthy();
    });
  });

  describe('#isSubPatternOf', () => {
    it('should be true on equal patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('', '', '', ''),
        squad('', '', '', ''),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('a', 'b', 'c', 'd'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '"b"', 'c', '"d"'),
        squad('a', '"b"', 'c', '"d"'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '"b"', '?c', '"d"'),
        squad('a', '"b"', '?c', '"d"'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?a', '"b"', 'c', '"d"'),
        squad('?a', '"b"', 'c', '"d"'),
      )).toBeTruthy();
    });

    it('should be false on non-sub-patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('a', 'b', 'c', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('a', 'b', '?v', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('?v', 'b', 'c', '?v'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('e', 'f', 'g', 'h'),
        squad('a', 'b', 'c', 'd'),
      )).toBeFalsy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'f', '?v', 'h'),
        squad('?v', 'b', '?v', 'd'),
      )).toBeFalsy();
    });

    it('should be true on sub-patterns', () => {
      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', '?v', '?v'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', '?v', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('?v', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('?v', '?v', '?v', '?v'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', '?v', 'd'),
        squad('a', 'b', '?v', 'd'),
      )).toBeTruthy();

      expect(FederatedQuadSource.isSubPatternOf(
        squad('a', 'b', 'c', 'd'),
        squad('a', 'b', '?v', 'd'),
      )).toBeTruthy();
    });
  });

  describe('A FederatedQuadSource instance with predefined empty patterns', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      subSource = {};
      emptyPatterns = new Map();
      emptyPatterns.set(subSource, [ squad('?a', '?b', '?c', '"d"') ]);
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        context,
        emptyPatterns,
        true,
      );
    });

    it('should return an AsyncIterator', async() => {
      const match = source.match(DF.variable('v'), DF.variable('v'), DF.variable('v'), DF.variable('v'));
      expect(match).toBeInstanceOf(TransformIterator);
      expect(await match.toArray()).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o2')),
      ]);
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(subSource, squad('?a', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "d" for the source should return true', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"d"'))).toBeTruthy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any>{}, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any>{}, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance with skipEmptyPatterns set to false', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns;

    beforeEach(() => {
      subSource = {};
      emptyPatterns = new Map();
      emptyPatterns.set(subSource, [ squad('?a', '?b', '?c', '"d"') ]);
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        context,
        emptyPatterns,
        false,
      );
    });

    describe('when calling isSourceEmpty', () => {
      it('on ?a ?b ?c "d" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d"d for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "e" for the source should return false', () => {
        return expect(source.isSourceEmpty(subSource, squad('"a"', '?b', '?c', '"e"'))).toBeFalsy();
      });

      it('on ?a ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any>{}, squad('?a', '?b', '?c', '"d"'))).toBeFalsy();
      });

      it('on "a" ?b ?c "d" for another source should return false', () => {
        return expect(source.isSourceEmpty(<any>{}, squad('"a"', '?b', '?c', '"d"'))).toBeFalsy();
      });
    });
  });

  describe('A FederatedQuadSource instance over zero sources', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextEmpty = new ActionContext({ [KeysRdfResolveQuadPattern.sources.name]: []});
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return an empty array of results using #toArray', async() => {
      expect(await source.match(v, v, v, v).toArray()).toEqual([]);
    });

    it('should return an empty array of results using arrayifyStream', async() => {
      expect(await source.match(v, v, v, v).toArray()).toEqual([]);
    });

    it('should emit metadata with 0 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'exact', value: 0 },
          canContainUndefs: false,
        });
      expect(await arrayifyStream(stream)).toEqual([]);
    });

    it('should reject when mediatorRdfMetadataAccumulate rejects', async() => {
      mediatorRdfMetadataAccumulate.mediate = () => Promise.reject(new Error(`mediatorRdfMetadataAccumulate error in FederatedQuadSource-test`));
      await expect(arrayifyStream(source.match(v, v, v, v))).rejects.toThrow(`mediatorRdfMetadataAccumulate error in FederatedQuadSource-test`);
    });
  });

  describe('A FederatedQuadSource instance over one empty source', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({ [KeysRdfResolveQuadPattern.sources.name]: [ subSource ]});
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return an empty AsyncIterator', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toEqual([]);
    });

    it('should emit metadata with 0 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
        });

      expect(await arrayifyStream(stream)).toEqual([]);
    });

    it('should store the queried empty patterns in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, [
          factory.createPattern(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')),
          factory.createPattern(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over one non-empty source', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingle;

    beforeEach(() => {
      subSource = { type: 'nonEmptySource', value: 'I will not be empty' };
      emptyPatterns = new Map();
      contextSingle = new ActionContext({ [KeysRdfResolveQuadPattern.sources.name]: [ subSource ]});
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingle,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator in the default graph', async() => {
      expect(await arrayifyStream(source.match(v, v, v, DF.defaultGraph()))).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return a non-empty AsyncIterator with variable graph', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 2 },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: false,
          otherMetadata: true,
        });

      expect(await arrayifyStream(stream)).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should store no queried empty patterns in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, []],
      ]);
    });

    it('destroyed before started should destroy the sub iterators', async() => {
      const it = source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g'));
      it.destroy();
      await new Promise(res => setImmediate(res, 10));
      expect(returnedIterators[0].done).toBeTruthy();
      expect(returnedIterators[0].destroy).toHaveReturnedTimes(1);
    });

    it('destroyed before started should void proxyIt errors', async() => {
      mediatorResolveQuadPattern.mediate = () => Promise.reject(new Error('ignored error'));

      const it = source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g'));
      it.on('error', () => {
        // Ignore errors
      });
      it.destroy();
      expect(returnedIterators.length).toEqual(0);
    });
  });

  describe('A FederatedQuadSource instance over one non-empty source with named graphs', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingle;

    beforeEach(() => {
      subSource = { type: 'graphs', value: 'I will contain named graphs' };
      emptyPatterns = new Map();
      contextSingle = new ActionContext({ [KeysRdfResolveQuadPattern.sources.name]: [ subSource ]});
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingle,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator in the default graph', async() => {
      expect(await arrayifyStream(source.match(v, v, v, DF.defaultGraph()))).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),

        // The following will be filtered away by sources under the federated, which is not applicable in this test.
        squad('s2', 'p1', 'o1', 'g1'),
        squad('s2', 'p1', 'o2', 'g1'),
        squad('s3', 'p1', 'o1', 'g2'),
        squad('s3', 'p1', 'o2', 'g2'),
      ]);
    });

    it('should return a non-empty AsyncIterator with variable graph', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),

        squad('s2', 'p1', 'o1', 'g1'),
        squad('s2', 'p1', 'o2', 'g1'),
        squad('s3', 'p1', 'o1', 'g2'),
        squad('s3', 'p1', 'o2', 'g2'),
      ]);
    });

    it('should emit metadata with 6 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 6 },
          canContainUndefs: false,
        });
      expect(await arrayifyStream(stream)).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),

        squad('s2', 'p1', 'o1', 'g1'),
        squad('s2', 'p1', 'o2', 'g1'),
        squad('s3', 'p1', 'o1', 'g2'),
        squad('s3', 'p1', 'o2', 'g2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over one empty source and one non-empty source', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'emptySource', value: 'I will be empty' };
      subSource2 = { type: 'nonEmptySource', value: 'I will not be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]: [
          subSource1,
          subSource2,
        ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator in the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return a non-empty AsyncIterator for variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 2 },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: false,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, [
          factory.createPattern(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')),
          factory.createPattern(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
        ]],
        [ subSource2, []],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'emptySource', value: 'I will be empty' };
      subSource2 = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]: [
          subSource1,
          subSource2,
        ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return an empty AsyncIterator for the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
        });
      expect(await stream.toArray()).toEqual([]);
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, [
          factory.createPattern(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')),
          factory.createPattern(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
        ]],
        [ subSource2, [
          factory.createPattern(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')),
          factory.createPattern(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two identical empty sources', () => {
    let subSource: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource = { type: 'emptySource', value: 'I will be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource,
            subSource,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return an empty AsyncIterator in the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
        });
      expect(await stream.toArray()).toEqual([]);
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource, [
          factory.createPattern(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')),
          factory.createPattern(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
        ]],
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two equal empty sources with skip empty sources false', () => {
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            { type: 'emptySource', value: 'I will be empty' },
            { type: 'emptySource', value: 'I will be empty' },
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        false,
      );
    });

    it('should return an empty AsyncIterator in the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([]);
    });

    it('should emit metadata with 0 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
        });
      expect(await stream.toArray()).toEqual([]);
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'nonEmptySource', value: 'I will not be empty' };
      subSource2 = { type: 'nonEmptySource2', value: 'I will also not be empty' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
            subSource2,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator in the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toBeRdfIsomorphic([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return a non-empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with 2 cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 4 },
          requestTime: 20,
          pageSize: 200,
          canContainUndefs: false,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should store the queried empty patterns for the empty source in the emptyPatterns datastructure', async() => {
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.variable('s'), DF.literal('p'), DF.literal('o'), DF.variable('g')));

      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.variable('g')));
      await arrayifyStream(source.match(DF.literal('s'), DF.variable('p'), DF.literal('o'), DF.literal('g')));

      expect([ ...emptyPatterns.entries() ]).toEqual([
        [ subSource1, []],
        [ subSource2, []],
      ]);
    });

    it('should reject when mediatorRdfMetadataAccumulate rejects', async() => {
      mediatorRdfMetadataAccumulate.mediate = () => Promise.reject(new Error(`mediatorRdfMetadataAccumulate error in FederatedQuadSource-test`));
      await expect(arrayifyStream(source.match(v, v, v, v))).rejects.toThrow(`mediatorRdfMetadataAccumulate error in FederatedQuadSource-test`);
    });

    it('should reject when mediatorResolveQuadPattern rejects', async() => {
      mediatorResolveQuadPattern.mediate = () => Promise.reject(new Error(`mediatorResolveQuadPattern error in FederatedQuadSource-test`));
      await expect(arrayifyStream(source.match(v, v, v, v))).rejects.toThrow(`mediatorResolveQuadPattern error in FederatedQuadSource-test`);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, one without metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator for the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: false,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, each without metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            { type: 'nonEmptySourceNoMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceNoMeta', value: 'I will also not be empty, but have no metadata' },
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator for the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, one with infinity metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            { type: 'nonEmptySource', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator for the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          requestTime: 10,
          pageSize: 100,
          canContainUndefs: false,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources, each with infinity metadata', () => {
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            { type: 'nonEmptySourceInfMeta', value: 'I will not be empty' },
            { type: 'nonEmptySourceInfMeta', value: 'I will also not be empty, but have inf metadata' },
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator for the default graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should return an empty AsyncIterator for a variable graph', async() => {
      const a = await arrayifyStream(source.match(v, v, v, v));
      expect(a).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });

    it('should emit metadata with Infinity cardinality', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two non-empty sources with blank nodes', () => {
    let subSource1;
    let subSource2;
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'blankNodeSource', value: 'I will contain blank nodes' };
      subSource2 = { type: 'blankNodeSource', value: 'I will also contain blank nodes' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
            subSource2,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should return a non-empty AsyncIterator', async() => {
      const a = await arrayifyStream(source.match(v, v, v, DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_0_s1',
            DF.namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            DF.namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            DF.namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s1',
            DF.namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            DF.namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            DF.namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_0_s2',
            DF.namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            DF.namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            DF.namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s2',
            DF.namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            DF.namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            DF.namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match will all sources for named nodes', async() => {
      const a = await arrayifyStream(source.match(DF.namedNode('abc'), v, v, DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_0_s1',
            DF.namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            DF.namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            DF.namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s1',
            DF.namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            DF.namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            DF.namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_0_s2',
            DF.namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            DF.namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            DF.namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s2',
            DF.namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            DF.namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            DF.namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match will all sources for plain blank nodes', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        DF.namedNode('abc')), v, v, DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_0_s1',
            DF.namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            DF.namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            DF.namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s1',
            DF.namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            DF.namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            DF.namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_0_s2',
            DF.namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            DF.namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            DF.namedNode('urn:comunica_skolem:source_0:o2')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s2',
            DF.namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            DF.namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            DF.namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match the first source for blank nodes coming from the first source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_0:s1')), v, v, DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_0_s1',
            DF.namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            DF.namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            DF.namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_0_s2',
            DF.namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            DF.namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            DF.namedNode('urn:comunica_skolem:source_0:o2')),
        ),
      ]);
    });

    it('should match the second source for blank nodes coming from the second source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_1:s1')), v, v, DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_1_s1',
            DF.namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            DF.namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            DF.namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s2',
            DF.namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            DF.namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            DF.namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match no source for blank nodes coming from an unknown source', async() => {
      const a = await arrayifyStream(source.match(new BlankNodeScoped('abc',
        DF.namedNode('urn:comunica_skolem:source_2:s1')), v, v, DF.defaultGraph()));
      expect(a).toEqual([]);
    });

    it('should match the first source for named nodes coming from the first source', async() => {
      const a = await arrayifyStream(source.match(DF.namedNode('urn:comunica_skolem:source_0:s1'),
        v,
        v,
        DF.defaultGraph()));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_0_s1',
            DF.namedNode('urn:comunica_skolem:source_0:s1')),
          new BlankNodeScoped('bc_0_p1',
            DF.namedNode('urn:comunica_skolem:source_0:p1')),
          new BlankNodeScoped('bc_0_o1',
            DF.namedNode('urn:comunica_skolem:source_0:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_0_s2',
            DF.namedNode('urn:comunica_skolem:source_0:s2')),
          new BlankNodeScoped('bc_0_p2',
            DF.namedNode('urn:comunica_skolem:source_0:p2')),
          new BlankNodeScoped('bc_0_o2',
            DF.namedNode('urn:comunica_skolem:source_0:o2')),
        ),
      ]);
    });

    it('should match the second source for named nodes coming from the second source', async() => {
      const a = await arrayifyStream(source.match(
        DF.namedNode('urn:comunica_skolem:source_1:s1'),
        v,
        v,
        DF.defaultGraph(),
      ));
      expect(a).toEqual([
        DF.quad(
          new BlankNodeScoped('bc_1_s1',
            DF.namedNode('urn:comunica_skolem:source_1:s1')),
          new BlankNodeScoped('bc_1_p1',
            DF.namedNode('urn:comunica_skolem:source_1:p1')),
          new BlankNodeScoped('bc_1_o1',
            DF.namedNode('urn:comunica_skolem:source_1:o1')),
        ),
        DF.quad(
          new BlankNodeScoped('bc_1_s2',
            DF.namedNode('urn:comunica_skolem:source_1:s2')),
          new BlankNodeScoped('bc_1_p2',
            DF.namedNode('urn:comunica_skolem:source_1:p2')),
          new BlankNodeScoped('bc_1_o2',
            DF.namedNode('urn:comunica_skolem:source_1:o2')),
        ),
      ]);
    });

    it('should match no source for named nodes coming from an unknown source', async() => {
      const a = await arrayifyStream(source.match(DF.namedNode('urn:comunica_skolem:source_2:s1'), v, v, v));
      expect(a).toEqual([]);
    });
  });

  describe('A FederatedQuadSource instance over two sources, the first one containing undefs', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'nonEmptySourceUndefs', value: 'I will not be empty' };
      subSource2 = { type: 'nonEmptySource', value: 'I will also not be empty, and contain undefs' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
            subSource2,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should emit metadata with canContainUndefs true', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 4 },
          pageSize: 100,
          requestTime: 10,
          canContainUndefs: true,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two sources, the second one containing undefs', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'nonEmptySource', value: 'I will not be empty' };
      subSource2 = { type: 'nonEmptySourceUndefs', value: 'I will also not be empty, and contain undefs' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
            subSource2,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should emit metadata with canContainUndefs true', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 4 },
          pageSize: 100,
          requestTime: 10,
          canContainUndefs: true,
          otherMetadata: true,
        });

      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over two sources, both containing undefs', () => {
    let subSource1: any;
    let subSource2: any;
    let source: FederatedQuadSource;
    let emptyPatterns: any;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'nonEmptySourceUndefs', value: 'I will not be empty' };
      subSource2 = { type: 'nonEmptySourceUndefs', value: 'I will also not be empty, and contain undefs' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
            subSource2,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should emit metadata with canContainUndefs true', async() => {
      const stream = source.match(v, v, v, v);
      await expect(new Promise(resolve => stream.getProperty('metadata', resolve)))
        .resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 4 },
          canContainUndefs: true,
        });
      expect(await stream.toArray()).toEqual([
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o1'),
        squad('s1', 'p1', 'o2'),
        squad('s1', 'p1', 'o2'),
      ]);
    });
  });

  describe('A FederatedQuadSource instance over an erroring source', () => {
    let subSource1;
    let source: FederatedQuadSource;
    let emptyPatterns;
    let contextSingleEmpty;

    beforeEach(() => {
      subSource1 = { type: 'errorSource', value: 'I will emit a data error' };
      emptyPatterns = new Map();
      contextSingleEmpty = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]:
          [
            subSource1,
          ],
      });
      source = new FederatedQuadSource(
        mediatorResolveQuadPattern,
        mediatorRdfMetadataAccumulate,
        contextSingleEmpty,
        emptyPatterns,
        true,
      );
    });

    it('should emit an error', async() => {
      await expect(arrayifyStream(source.match(v, v, v, DF.defaultGraph()))).rejects
        .toThrow(new Error('FederatedQuadSource: errorSource'));
    });
  });
});
