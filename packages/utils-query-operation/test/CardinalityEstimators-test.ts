import type { IDataset, QueryResultCardinality } from '@comunica/types';
import { AlgebraFactory, Algebra } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import {
  estimateCardinality,
  estimateUnionCardinality,
} from '../lib/CardinalityEstimators';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('CardinalityEstimators', () => {
  let dataset: IDataset;
  const datasetUri = 'http://localhost/sparql';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    dataset = {
      getCardinality: jest.fn().mockImplementation(
        (operation: Algebra.Operation): QueryResultCardinality | undefined => {
          if (operation.type === Algebra.Types.PATTERN) {
            return { type: 'estimate', value: 2, dataset: datasetUri };
          }
          if (operation.type === Algebra.Types.NOP) {
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

    it('should return estimated infinity for an unsupported operation', async() => {
      const operation = <Algebra.Operation>{ type: 'unsupported' };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: Number.POSITIVE_INFINITY,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should return 1 for ask', async() => {
      const operation = <Algebra.Operation>{ type: Algebra.Types.ASK };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'exact',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.Types.LOAD,
      Algebra.Types.DELETE_INSERT,
      Algebra.Types.ADD,
      Algebra.Types.COMPOSITE_UPDATE,
      Algebra.Types.CLEAR,
      Algebra.Types.NOP,
      Algebra.Types.DROP,
      Algebra.Types.CREATE,
      Algebra.Types.MOVE,
      Algebra.Types.COPY,
    ])('should return exact 0 for %s', async(type) => {
      const operation = <Algebra.Operation>{ type };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.Types.SERVICE,
      Algebra.Types.DESCRIBE,
      Algebra.Types.EXPRESSION,
    ])('should return estimated infinity for %s', async(type) => {
      const operation = <Algebra.Operation>{ type };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: Number.POSITIVE_INFINITY,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it.each([
      Algebra.Types.PROJECT,
      Algebra.Types.FILTER,
      Algebra.Types.ORDER_BY,
      Algebra.Types.GROUP,
      Algebra.Types.CONSTRUCT,
      Algebra.Types.DISTINCT,
      Algebra.Types.REDUCED,
      Algebra.Types.EXTEND,
      Algebra.Types.FROM,
      Algebra.Types.GRAPH,
    ])('should return estimate for %s using input', async(type) => {
      const operation = <Algebra.Operation>{ type, input: pattern1 };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, (<any> operation).input);
    });

    it.each([
      Algebra.Types.ZERO_OR_ONE_PATH,
      Algebra.Types.ZERO_OR_MORE_PATH,
      Algebra.Types.ONE_OR_MORE_PATH,
      Algebra.Types.INV,
    ])('should return estimate for %s using path', async(type) => {
      const operation = <Algebra.Operation>{ type, path: pattern1 };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, (<any> operation).path);
    });

    it.each([
      Algebra.Types.UNION,
      Algebra.Types.SEQ,
      Algebra.Types.ALT,
    ])('should return estimate for %s using input', async(type) => {
      const operation = <Algebra.Operation>{ type, input: [ pattern1, pattern2 ]};
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 4,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, (<any> operation).input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, (<any> operation).input[1]);
    });

    it('should return estimate for join', async() => {
      const input = [ pattern1, pattern2 ];
      const operation = <Algebra.Operation>{ type: Algebra.Types.JOIN, input };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, (<any> operation).input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, (<any> operation).input[1]);
    });

    it('should return estimate for bgp', async() => {
      const patterns = [ pattern1, pattern2 ];
      const operation = <Algebra.Operation>{ type: Algebra.Types.BGP, patterns };
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, (<any> operation).patterns[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, (<any> operation).patterns[1]);
    });

    it('should return estimate for slice', async() => {
      const operation = AF.createSlice(pattern1, 1, 2);
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for slice without length', async() => {
      const operation = AF.createSlice(pattern1, 1);
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 1,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for slice over nop', async() => {
      const operation = AF.createSlice(AF.createNop(), 1, 2);
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(2);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input);
    });

    it('should return estimate for minus', async() => {
      const operation = AF.createMinus(pattern1, pattern2);
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.input[0]);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, operation.input[1]);
    });

    it('should return estimate for pattern', async() => {
      const operation = pattern1;
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });

    it('should return estimate for nps', async() => {
      const operation = AF.createNps([ namedNode ]);
      const expectedLink = AF.createLink(namedNode);
      const expectedSeq = AF.createSeq([ expectedLink ]);
      const expectedTotalPattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      const expectedLinkPattern = AF.createPattern(DF.variable('s'), namedNode, DF.variable('o'));
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
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

    it('should return estimate for path', async() => {
      const expectedPredicatePattern = AF.createPattern(DF.variable('s'), namedNode, DF.variable('o'));
      const operation = AF.createPath(pattern1.subject, AF.createLink(namedNode), pattern1.object);
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(3);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(2, operation.predicate);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(3, expectedPredicatePattern);
    });

    it.each([ 0, 1, 10 ])(`should return estimate for ${Algebra.Types.VALUES} with %d bindings`, async(count) => {
      const operation = <Algebra.Operation>{ type: Algebra.Types.VALUES, bindings: { length: count }};
      await expect(estimateCardinality(operation, dataset)).resolves.toEqual({
        type: 'exact',
        value: count,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenCalledTimes(1);
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, operation);
    });
  });

  describe('estimateUnionCardinality', () => {
    it('should return 0 without any input', async() => {
      await expect(estimateUnionCardinality([], dataset)).resolves.toEqual({
        type: 'exact',
        value: 0,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).not.toHaveBeenCalled();
    });

    it('should return the sum of input', async() => {
      const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      await expect(estimateUnionCardinality([ pattern ], dataset)).resolves.toEqual({
        type: 'estimate',
        value: 2,
        dataset: datasetUri,
      });
      expect(dataset.getCardinality).toHaveBeenNthCalledWith(1, pattern);
    });
  });
});
