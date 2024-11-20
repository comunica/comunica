import type { IQueryEngine, QueryResultCardinality } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory, Algebra } from 'sparqlalgebrajs';
import { VoidDataset } from '../lib/VoidDataset';

const DF = new DataFactory();
const AF = new Factory(DF);

const rdfType = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

const subjectBNode = DF.blankNode('s');
const subjectNamedNode = DF.namedNode('ex:s');
const subjectVariable = DF.variable('s');
const subjectLiteral = DF.literal('s');

const predicateNamedNode = DF.namedNode('ex:p');
const predicateVariable = DF.variable('p');

const objectBNode = DF.blankNode('o');
const objectNamedNode = DF.namedNode('ex:o');
const objectVariable = DF.variable('o');
const objectLiteral = DF.literal('o');

const patterns = {
  '?s rdf:type <o>': AF.createPattern(subjectVariable, rdfType, objectNamedNode),
  '?s rdf:type _:o': AF.createPattern(subjectVariable, rdfType, objectBNode),
  '?s ?p ?o': AF.createPattern(subjectVariable, predicateVariable, objectVariable),
  '?s ?p "o"': AF.createPattern(subjectVariable, predicateVariable, objectLiteral),
  '<s> ?p ?o': AF.createPattern(subjectNamedNode, predicateVariable, objectVariable),
  '_:s ?p ?o': AF.createPattern(subjectBNode, predicateVariable, objectVariable),
  '<s> ?p "o"': AF.createPattern(subjectNamedNode, predicateVariable, objectLiteral),
  '_:s ?p "o"': AF.createPattern(subjectBNode, predicateVariable, objectLiteral),
  '?s <p> ?o': AF.createPattern(subjectVariable, predicateNamedNode, objectVariable),
  '?s <p> "o"': AF.createPattern(subjectVariable, predicateNamedNode, objectLiteral),
  '?s ?p <o>': AF.createPattern(subjectVariable, predicateVariable, objectNamedNode),
  '?s ?p _:o': AF.createPattern(subjectVariable, predicateVariable, objectBNode),
  '<s> <p> ?o': AF.createPattern(subjectNamedNode, predicateNamedNode, objectVariable),
  '_:s <p> ?o': AF.createPattern(subjectBNode, predicateNamedNode, objectVariable),
  '<s> <p> "o"': AF.createPattern(subjectNamedNode, predicateNamedNode, objectLiteral),
  '_:s <p> "o"': AF.createPattern(subjectBNode, predicateNamedNode, objectLiteral),
  '<s> ?p <o>': AF.createPattern(subjectNamedNode, predicateVariable, objectNamedNode),
  '_:s ?p <o>': AF.createPattern(subjectBNode, predicateVariable, objectNamedNode),
  '<s> ?p _:o': AF.createPattern(subjectNamedNode, predicateVariable, objectBNode),
  '_:s ?p _:o': AF.createPattern(subjectBNode, predicateVariable, objectBNode),
  '?s <p> <o>': AF.createPattern(subjectVariable, predicateNamedNode, objectNamedNode),
  '?s <p> _:o': AF.createPattern(subjectVariable, predicateNamedNode, objectBNode),
  '<s> <p> <o>': AF.createPattern(subjectNamedNode, predicateNamedNode, objectNamedNode),
  '_:s <p> <o>': AF.createPattern(subjectBNode, predicateNamedNode, objectNamedNode),
  '<s> <p> _:o': AF.createPattern(subjectNamedNode, predicateNamedNode, objectBNode),
  '_:s <p> _:o': AF.createPattern(subjectBNode, predicateNamedNode, objectBNode),
};

const ignoredPatternExamples = {
  '"s" <p> "o"': AF.createPattern(subjectLiteral, predicateNamedNode, objectLiteral),
  '"s" ?p "o"': AF.createPattern(subjectLiteral, predicateVariable, objectLiteral),
};

describe('VoidDataset', () => {
  let queryEngine: IQueryEngine;
  let dataset: VoidDataset;
  let store: RDF.Store;

  const triples = 4321;
  const source = 'http://localhost:3000/sparql';

  const queryCacheSize = 10;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    store = <any>{};
    queryEngine = <any>{
      queryBindings: jest.fn().mockRejectedValue(new Error('queryBindings called')),
    };
    dataset = new VoidDataset({
      identifier: DF.namedNode(source),
      queryCacheSize,
      queryEngine,
      source,
      store,
      triples,
      vocabularies: [],
      resourceUriPattern: undefined,
    });
  });

  describe('uri', () => {
    it('should return the value of identifier', () => {
      expect(dataset.uri).toBe(source);
    });
  });

  describe('cardinality', () => {
    const joinCardinality = 'join_cardinality';
    const patternCardinality = 'pattern_cardinality';
    const graphCardinality = 'graph_cardinality';
    const fromCardinality = 'from_cardinality';
    const sliceCardinality = 'slice_cardinality';
    const minusCardinality = 'minus_cardinality';

    beforeEach(() => {
      jest.spyOn(dataset, 'estimateJoinCardinality').mockResolvedValue(<any>joinCardinality);
      jest.spyOn(dataset, 'estimatePatternCardinality').mockResolvedValue(<any>patternCardinality);
      jest.spyOn(dataset, 'estimateGraphCardinality').mockResolvedValue(<any>graphCardinality);
      jest.spyOn(dataset, 'estimateFromCardinality').mockResolvedValue(<any>fromCardinality);
      jest.spyOn(dataset, 'estimateSliceCardinality').mockResolvedValue(<any>sliceCardinality);
      jest.spyOn(dataset, 'estimateMinusCardinality').mockResolvedValue(<any>minusCardinality);
      jest.spyOn(dataset, 'getCardinality');
    });

    it.each([
      Algebra.types.PROJECT,
      Algebra.types.FILTER,
      Algebra.types.ORDER_BY,
      Algebra.types.GROUP,
      Algebra.types.CONSTRUCT,
    ])('should call itself again with the input of %s', async(type) => {
      const input = { type: 'fallback' };
      const operation = { type, input };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual({
        type: 'estimate',
        value: Number.POSITIVE_INFINITY,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, input);
    });

    it.each([
      Algebra.types.JOIN,
      Algebra.types.BGP,
    ])('should estimate cardinality for %s', async(type) => {
      const input = [{ type: Algebra.types.PATTERN }];
      const operation = { type, input, patterns: input };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimateJoinCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(joinCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimateJoinCardinality).toHaveBeenNthCalledWith(1, input);
    });

    it('should estimate cardinality for graph', async() => {
      const operation = { type: Algebra.types.GRAPH };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimateGraphCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(graphCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimateGraphCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should estimate cardinality for from', async() => {
      const operation = { type: Algebra.types.FROM };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimateFromCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(fromCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimateFromCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should estimate cardinality for slice', async() => {
      const operation = { type: Algebra.types.SLICE };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimateSliceCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(sliceCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimateSliceCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should estimate cardinality for minus', async() => {
      const operation = { type: Algebra.types.MINUS };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimateMinusCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(minusCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimateMinusCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should estimate cardinality for pattern', async() => {
      const operation = { type: Algebra.types.PATTERN };
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      expect(dataset.estimatePatternCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual(patternCardinality);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.estimatePatternCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([ 0, 1, 10, 100 ])(`should estimate cardinality for ${Algebra.types.VALUES} with %d bindings`, async(count) => {
      const operation = { type: Algebra.types.VALUES, bindings: { length: count }};
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.getCardinality(<any>operation)).resolves.toEqual({
        type: 'exact',
        value: count,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });
  });

  describe('estimatePatternCardinality', () => {
    it('should return the estimated cardinality', async() => {
      jest.spyOn(dataset, 'matchResourceUriPattern').mockReturnValue(true);
      jest.spyOn(dataset, 'matchVocabularies').mockReturnValue(true);
      jest.spyOn(dataset, 'estimatePatternCardinalityRaw').mockResolvedValue(1);
      expect(dataset.matchResourceUriPattern).not.toHaveBeenCalled();
      expect(dataset.matchVocabularies).not.toHaveBeenCalled();
      expect(dataset.estimatePatternCardinalityRaw).not.toHaveBeenCalled();
      await expect(dataset.estimatePatternCardinality(<any>{})).resolves.toEqual({
        type: 'estimate',
        value: 1,
        dataset: source,
      });
      expect(dataset.matchResourceUriPattern).toHaveBeenCalledTimes(1);
      expect(dataset.matchVocabularies).toHaveBeenCalledTimes(1);
      expect(dataset.estimatePatternCardinalityRaw).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when the dataset cannot answer the pattern', async() => {
      jest.spyOn(dataset, 'matchResourceUriPattern').mockReturnValue(false);
      jest.spyOn(dataset, 'matchVocabularies').mockReturnValue(false);
      jest.spyOn(dataset, 'estimatePatternCardinalityRaw').mockResolvedValue(1);
      expect(dataset.matchResourceUriPattern).not.toHaveBeenCalled();
      expect(dataset.matchVocabularies).not.toHaveBeenCalled();
      expect(dataset.estimatePatternCardinalityRaw).not.toHaveBeenCalled();
      await expect(dataset.estimatePatternCardinality(<any>{})).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: source,
      });
      expect(dataset.matchVocabularies).toHaveBeenCalledTimes(1);
      expect(dataset.matchResourceUriPattern).not.toHaveBeenCalled();
      expect(dataset.estimatePatternCardinalityRaw).not.toHaveBeenCalled();
    });
  });

  describe('estimateMinusCardinality', () => {
    it('should return the difference between the inputs', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValueOnce(<any>{ type: 'a', value: 3, dataset: 'a' });
      jest.spyOn(dataset, 'getCardinality').mockResolvedValueOnce(<any>{ type: 'b', value: 2, dataset: 'b' });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateMinusCardinality(<any>{ input: [ 'input1', 'input2' ]})).resolves.toEqual({
        type: 'estimate',
        value: 1,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
    });

    it('should set the difference between inputs to 0 when below it', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValueOnce(<any>{ type: 'a', value: 1, dataset: 'a' });
      jest.spyOn(dataset, 'getCardinality').mockResolvedValueOnce(<any>{ type: 'b', value: 4, dataset: 'b' });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateMinusCardinality(<any>{ input: [ 'input1', 'input2' ]})).resolves.toEqual({
        type: 'estimate',
        value: 0,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
    });
  });

  describe('estimateSliceCardinality', () => {
    it('should return an estimated size of the sliced input', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>{ type: 'estimate', value: 5, dataset: source });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateSliceCardinality(<any>{ input: 'input', start: 1, length: 2 })).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return the remaining input size with no length specified', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>{ type: 'estimate', value: 5, dataset: source });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateSliceCardinality(<any>{ input: 'input', start: 2 })).resolves.toEqual({
        type: 'estimate',
        value: 3,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return the remaining input size when length is greater than input size', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>{ type: 'estimate', value: 5, dataset: source });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateSliceCardinality(<any>{ input: 'input', start: 3, length: 10 })).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });
  });

  describe('estimateFromCardinality', () => {
    it('should return 0 when none of the graph URIs match', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>'cardinality');
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateFromCardinality(<any>{ default: [], named: []})).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: source,
      });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
    });

    it('should return the input estimate when a default graph URI matches', async() => {
      const expected = 'cardinality';
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>expected);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateFromCardinality(<any>{
        default: [{ value: source }],
        named: [],
      })).resolves.toBe(expected);
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return the input estimate when a named graph URI matches', async() => {
      const expected = 'cardinality';
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>expected);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateFromCardinality(<any>{
        default: [],
        named: [{ value: source }],
      })).resolves.toBe(expected);
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });
  });

  describe('estimateGraphCardinality', () => {
    it('should return 0 when the graph is a non-matching named node', async() => {
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>'cardinality');
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateGraphCardinality(<any>{
        name: { termType: 'NamedNode', value: 'abc' },
      })).resolves.toEqual({ type: 'exact', value: 0, dataset: source });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
    });

    it('should return estimated cardinality when the graph is a variable', async() => {
      const expected = 'cardinality';
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>expected);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateGraphCardinality(<any>{ name: { termType: 'Variable' }})).resolves.toBe(expected);
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return estimated cardinality when the graph is a matching named node', async() => {
      const expected = 'cardinality';
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(<any>expected);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateGraphCardinality(<any>{
        name: { termType: 'NamedNode', value: source },
      })).resolves.toBe(expected);
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });
  });

  describe('estimateJoinCardinality', () => {
    it.each([ 1, 10, 100 ])('should return the estimate over %d entries', async(entries) => {
      const entryCardinality = 2;
      const operations: Algebra.Operation[] = [];
      for (let i = 0; i < entries; i++) {
        operations.push(<any>`entry${i}`);
      }
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue({
        type: 'estimate',
        value: entryCardinality,
        dataset: source,
      });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateJoinCardinality(operations)).resolves.toEqual({
        type: 'estimate',
        value: entryCardinality * entries,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(entries);
    });

    it('should return infinity immediately after one join entry reaches it', async() => {
      const value = Number.POSITIVE_INFINITY;
      const cardinality: QueryResultCardinality = { type: 'estimate', value, dataset: source };
      const operations: Algebra.Operation[] = <any>[ 'operation1', 'operation2' ];
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(cardinality);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateJoinCardinality(operations)).resolves.toEqual(cardinality);
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
    });

    it('should return exact 0 when all entries return 0', async() => {
      const value = 0;
      const cardinality: QueryResultCardinality = { type: 'estimate', value, dataset: source };
      const operations: Algebra.Operation[] = <any>[ 'operation1', 'operation2' ];
      jest.spyOn(dataset, 'getCardinality').mockResolvedValue(cardinality);
      expect(dataset.getCardinality).not.toHaveBeenCalled();
      await expect(dataset.estimateJoinCardinality(operations)).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: source,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
    });
  });

  describe('matchResourceUriPattern', () => {
    describe.each(Object.entries(patterns))('for patterns in the style of %s', (_, pattern) => {
      it.each([
        [ 'no', true, undefined ],
        [ 'matching', true, /^ex:/u ],
        [ 'unrelated', pattern.subject.termType !== 'NamedNode' && pattern.object.termType !== 'NamedNode', /^ex2:/u ],
      ])('with %s resourceUriPattern should return %s', (_, expectedOutput, resourceUriPattern) => {
        jest.replaceProperty(dataset, 'resourceUriPattern', resourceUriPattern);
        expect(dataset.matchResourceUriPattern(pattern)).toBe(expectedOutput);
      });
    });
  });

  describe('matchVocabularies', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.variable('o'));

    it('should return true without vocabularies provided', () => {
      jest.replaceProperty(dataset, 'vocabularies', undefined);
      expect(dataset.matchVocabularies(pattern)).toBeTruthy();
    });

    it('should return true when matching vocabularies are provided', () => {
      jest.replaceProperty(dataset, 'vocabularies', [ 'ex:' ]);
      expect(dataset.matchVocabularies(pattern)).toBeTruthy();
    });

    it('should return false with non-matching vocabularies provided', () => {
      jest.replaceProperty(dataset, 'vocabularies', [ 'ex2:' ]);
      expect(dataset.matchVocabularies(pattern)).toBeFalsy();
    });
  });

  describe('estimatePatternCardinalityRaw', () => {
    describe.each(Object.entries(patterns))('for patterns in the style of %s', (_, pattern) => {
      it('should shortcut to zero with no triples', async() => {
        jest.replaceProperty(dataset, 'triples', 0);
        jest.spyOn(dataset, 'getPredicateTriples').mockResolvedValue(0);
        jest.spyOn(dataset, 'getClassPartitionEntities').mockResolvedValue(0);
        jest.spyOn(dataset, 'getDistinctSubjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getDistinctObjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getPredicateObjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getPredicateSubjects').mockResolvedValue(0);
        await expect(dataset.estimatePatternCardinalityRaw(pattern)).resolves.toBe(0);
        expect(dataset.getPredicateTriples).not.toHaveBeenCalled();
        expect(dataset.getClassPartitionEntities).not.toHaveBeenCalled();
        expect(dataset.getDistinctSubjects).not.toHaveBeenCalled();
        expect(dataset.getDistinctObjects).not.toHaveBeenCalled();
        expect(dataset.getPredicateObjects).not.toHaveBeenCalled();
        expect(dataset.getPredicateSubjects).not.toHaveBeenCalled();
      });

      it('should handle cases with no relevant triples in the dataset', async() => {
        const expected = (pattern.predicate.termType !== 'Variable' || pattern.predicate.value === rdfType.value) ?
          0 :
          triples;
        jest.spyOn(dataset, 'getPredicateTriples').mockResolvedValue(0);
        jest.spyOn(dataset, 'getClassPartitionEntities').mockResolvedValue(0);
        jest.spyOn(dataset, 'getDistinctSubjects').mockResolvedValue(1);
        jest.spyOn(dataset, 'getDistinctObjects').mockResolvedValue(1);
        jest.spyOn(dataset, 'getPredicateObjects').mockResolvedValue(1);
        jest.spyOn(dataset, 'getPredicateSubjects').mockResolvedValue(1);
        await expect(dataset.estimatePatternCardinalityRaw(pattern)).resolves.toBe(expected);
      });

      it('should handle cases where formulae divisor goes to zero', async() => {
        let expected = triples;
        // * <p> * should return predicate triples value
        if (pattern.predicate.termType === 'NamedNode') {
          expected = 123;
        }
        // ?s rdf:type <o> should return class partition entities count
        if (pattern.predicate.value === rdfType.value) {
          expected = 987;
        }
        jest.spyOn(dataset, 'getPredicateTriples').mockResolvedValue(123);
        jest.spyOn(dataset, 'getClassPartitionEntities').mockResolvedValue(987);
        jest.spyOn(dataset, 'getDistinctSubjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getDistinctObjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getPredicateObjects').mockResolvedValue(0);
        jest.spyOn(dataset, 'getPredicateSubjects').mockResolvedValue(0);
        await expect(dataset.estimatePatternCardinalityRaw(pattern)).resolves.toBe(expected);
      });

      it('should return a non-zero value when all the metrics are available', async() => {
        const triples = Math.random() * 10_000_000;
        const classPartitionEntities = 0.2 * triples;
        const distinctSubjects = 0.1 * triples;
        const distinctObjects = 0.05 * triples;
        const predicateTriples = 2.1 * distinctSubjects * distinctObjects;
        const predicateSubjects = 0.1 * distinctSubjects;
        const predicateObjects = 0.8 * distinctObjects;
        jest.spyOn(dataset, 'getClassPartitionEntities').mockResolvedValue(classPartitionEntities);
        jest.spyOn(dataset, 'getDistinctSubjects').mockResolvedValue(distinctSubjects);
        jest.spyOn(dataset, 'getDistinctObjects').mockResolvedValue(distinctObjects);
        jest.spyOn(dataset, 'getPredicateTriples').mockResolvedValue(predicateTriples);
        jest.spyOn(dataset, 'getPredicateObjects').mockResolvedValue(predicateObjects);
        jest.spyOn(dataset, 'getPredicateSubjects').mockResolvedValue(predicateSubjects);
        await expect(dataset.estimatePatternCardinalityRaw(pattern)).resolves.toBeGreaterThanOrEqual(0);
      });
    });

    describe.each(Object.entries(ignoredPatternExamples))('for patterns in the style of %s', (_, pattern) => {
      it('should return dataset triple count', async() => {
        await expect(dataset.estimatePatternCardinalityRaw(pattern)).resolves.toBe(triples);
      });
    });
  });

  describe('getDistinctSubjects', () => {
    it('should execute successfully', async() => {
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getDistinctSubjects()).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining('void:distinctSubjects'));
    });
  });

  describe('getDistinctObjects', () => {
    it('should execute successfully', async() => {
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getDistinctObjects()).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining('void:distinctObjects'));
    });
  });

  describe('getPredicateTriples', () => {
    it('should execute successfully', async() => {
      const predicate = DF.namedNode('ex:p');
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getPredicateTriples(predicate)).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining(predicate.value));
    });
  });

  describe('getPredicateSubjects', () => {
    it('should execute successfully', async() => {
      const predicate = DF.namedNode('ex:p');
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getPredicateSubjects(predicate)).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining(predicate.value));
    });
  });

  describe('getPredicateObjects', () => {
    it('should execute successfully', async() => {
      const predicate = DF.namedNode('ex:p');
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getPredicateObjects(predicate)).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining(predicate.value));
    });
  });

  describe('getClassPartitionEntities', () => {
    it('should execute successfully', async() => {
      const object = DF.namedNode('ex:o');
      jest.spyOn(dataset, 'getBindings').mockResolvedValue([]);
      expect(dataset.getBindings).not.toHaveBeenCalled();
      await expect(dataset.getClassPartitionEntities(object)).resolves.toBe(0);
      expect(dataset.getBindings).toHaveBeenNthCalledWith(1, expect.stringContaining(object.value));
    });
  });

  describe('getBindings', () => {
    it('should execute the given query and cache the result', async() => {
      const bindings = 'engine_bindings';
      jest.spyOn(queryEngine, 'queryBindings').mockResolvedValue(<any>{
        toArray: jest.fn().mockResolvedValue(<any>bindings),
      });
      expect(queryEngine.queryBindings).not.toHaveBeenCalled();
      await expect(dataset.getBindings('q')).resolves.toEqual(bindings);
      expect(queryEngine.queryBindings).toHaveBeenCalledTimes(1);
      await expect(dataset.getBindings('q')).resolves.toEqual(bindings);
      expect(queryEngine.queryBindings).toHaveBeenCalledTimes(1);
    });
  });
});
