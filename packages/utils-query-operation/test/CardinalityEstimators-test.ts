import type { IDataset, QueryResultCardinality } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory, Algebra } from 'sparqlalgebrajs';
import {
  estimateCardinality,
  estimateUnionCardinality,
} from '../lib/CardinalityEstimators';

const DF = new DataFactory();
const AF = new Factory(DF);

describe('CardinalityEstimators', () => {
  let dataset: IDataset;
  const datasetUri = 'http://localhost/sparql';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    dataset = {
      getCardinality: jest.fn().mockImplementation(
        (operation: Algebra.Operation): QueryResultCardinality | undefined => {
          if (operation.type === Algebra.types.PATTERN) {
            return { type: 'estimate', value: 2, dataset: datasetUri };
          }
          if (operation.type === Algebra.types.NOP) {
            return { type: 'exact', value: 0, dataset: datasetUri };
          }
        },
      ),
      source: datasetUri,
      uri: datasetUri,
    };
  });

  describe('estimateCardinality', () => {
    const namedNode = DF.namedNode('ex:p');
    const pattern1 = AF.createPattern(DF.variable('s'), DF.variable('p1'), DF.variable('o1'));
    const pattern2 = AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.variable('o2'));

    it('should return 1 for ask', () => {
      const operation = <Algebra.Operation>{ type: Algebra.types.ASK };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'exact',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.types.LOAD,
      Algebra.types.DELETE_INSERT,
      Algebra.types.ADD,
      Algebra.types.COMPOSITE_UPDATE,
      Algebra.types.CLEAR,
      Algebra.types.NOP,
      Algebra.types.DROP,
      Algebra.types.CREATE,
      Algebra.types.MOVE,
      Algebra.types.COPY,
    ])('should return exact 0 for %s', (type) => {
      const operation = <Algebra.Operation>{ type };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.types.SERVICE,
      Algebra.types.DESCRIBE,
      Algebra.types.EXPRESSION,
    ])('should return estimated infinity for %s', (type) => {
      const operation = <Algebra.Operation>{ type };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: Number.POSITIVE_INFINITY,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.types.PROJECT,
      Algebra.types.FILTER,
      Algebra.types.ORDER_BY,
      Algebra.types.GROUP,
      Algebra.types.CONSTRUCT,
      Algebra.types.DISTINCT,
      Algebra.types.REDUCED,
      Algebra.types.EXTEND,
      Algebra.types.FROM,
      Algebra.types.GRAPH,
    ])('should return estimate for %s using input', (type) => {
      const operation = <Algebra.Operation>{ type, input: pattern1 };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it.each([
      Algebra.types.ZERO_OR_ONE_PATH,
      Algebra.types.ZERO_OR_MORE_PATH,
      Algebra.types.ONE_OR_MORE_PATH,
      Algebra.types.INV,
    ])('should return estimate for %s using path', (type) => {
      const operation = <Algebra.Operation>{ type, path: pattern1 };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.path);
    });

    it.each([
      Algebra.types.UNION,
      Algebra.types.SEQ,
      Algebra.types.ALT,
    ])('should return estimate for %s using input', (type) => {
      const operation = <Algebra.Operation>{ type, input: [ pattern1, pattern2 ]};
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 4,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, operation.input[1]);
    });

    it('should return estimate for join', () => {
      const input = [ pattern1, pattern2 ];
      const operation = <Algebra.Operation>{ type: Algebra.types.JOIN, input };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, operation.input[1]);
    });

    it('should return estimate for bgp', () => {
      const patterns = [ pattern1, pattern2 ];
      const operation = <Algebra.Operation>{ type: Algebra.types.BGP, patterns };
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.patterns[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, operation.patterns[1]);
    });

    it('should return estimate for slice', () => {
      const operation = AF.createSlice(pattern1, 1, 2);
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for slice without length', () => {
      const operation = AF.createSlice(pattern1, 1);
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for slice over nop', () => {
      const operation = AF.createSlice(AF.createNop(), 1, 2);
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for minus', () => {
      const operation = AF.createMinus(pattern1, pattern2);
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, operation.input[1]);
    });

    it('should return estimate for pattern', () => {
      const operation = pattern1;
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should return estimate for nps', () => {
      const operation = AF.createNps([ namedNode ]);
      const expectedLink = AF.createLink(namedNode);
      const expectedSeq = AF.createSeq([ expectedLink ]);
      const expectedTotalPattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      const expectedLinkPattern = AF.createPattern(DF.variable('s'), namedNode, DF.variable('o'));
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(5);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, expectedSeq);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, expectedLink);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(4, expectedLinkPattern);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(5, expectedTotalPattern);
    });

    it('should return estimate for path', () => {
      const expectedPredicatePattern = AF.createPattern(DF.variable('s'), namedNode, DF.variable('o'));
      const operation = AF.createPath(pattern1.subject, AF.createLink(namedNode), pattern1.object);
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.predicate);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, expectedPredicatePattern);
    });

    it.each([ 0, 1, 10 ])(`should return estimate for ${Algebra.types.VALUES} with %d bindings`, (count) => {
      const operation = <Algebra.Operation>{ type: Algebra.types.VALUES, bindings: { length: count }};
      expect(estimateCardinality(operation, dataset)).toEqual({
        type: 'exact',
        value: count,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });
  });

  describe('estimateUnionCardinality', () => {
    it('should return 0 without any input', () => {
      expect(estimateUnionCardinality([], dataset)).toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
    });

    it('should return the sum of input', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      expect(estimateUnionCardinality([ pattern ], dataset)).toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, pattern);
    });
  });
});
