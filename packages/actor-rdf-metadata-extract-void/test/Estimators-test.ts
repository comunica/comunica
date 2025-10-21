import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { RDF_TYPE } from '../lib/Definitions';
import {
  estimatePatternCardinality,
  estimatePatternCardinalityRaw,
  getClassPartitionEntities,
  getPredicateObjects,
  getPredicateSubjects,
  getPredicateTriples,
  getDistinctSubjects,
  getDistinctObjects,
  matchPatternVocabularies,
  matchPatternResourceUris,
} from '../lib/Estimators';
import type { IVoidDataset } from '../lib/Types';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

const rdfType = DF.namedNode(RDF_TYPE);

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

describe('Estimators', () => {
  let dataset: IVoidDataset;
  let datasetEmpty: IVoidDataset;

  const datasetTripleCount = 4321;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    dataset = {
      classes: 0,
      classPartitions: {},
      distinctObjects: 0,
      distinctSubjects: 0,
      entities: 0,
      identifier: 'ex:g',
      propertyPartitions: {},
      triples: datasetTripleCount,
      uriRegexPattern: /^ex:/u,
      vocabularies: [ 'ex:' ],
    };
    datasetEmpty = {
      classes: 0,
      classPartitions: {},
      distinctObjects: 0,
      distinctSubjects: 0,
      entities: 0,
      identifier: 'ex:g',
      propertyPartitions: {},
      triples: 0,
      uriRegexPattern: /^ex:/u,
      vocabularies: [ 'ex:' ],
    };
  });

  describe('estimatePatternCardinality', () => {
    it('should return the estimated cardinality', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      expect(estimatePatternCardinality(dataset, pattern)).toEqual({ type: 'estimate', value: datasetTripleCount });
    });

    it('should return the estimated cardinality for an empty dataset', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      expect(estimatePatternCardinality(datasetEmpty, pattern)).toEqual({ type: 'exact', value: 0 });
    });

    it('should return 0 when resource URIs are not found in the dataset', () => {
      const pattern = AF.createPattern(DF.namedNode('ex2:s'), DF.variable('p'), DF.namedNode('ex2:o'));
      expect(estimatePatternCardinality(dataset, pattern)).toEqual({ type: 'exact', value: 0 });
    });
  });

  describe('matchPatternResourceUris', () => {
    it('should return true without void:uriRegexPattern', () => {
      expect(matchPatternResourceUris(<any>{}, <any>'pattern')).toBeTruthy();
    });

    it('should return true with variables', () => {
      const pattern = AF.createPattern(DF.namedNode('ex2:s'), DF.namedNode('ex:p'), DF.variable('o'));
      expect(matchPatternResourceUris(dataset, pattern)).toBeTruthy();
    });

    it('should return true with matching named node resources', () => {
      const pattern = AF.createPattern(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'));
      expect(matchPatternResourceUris(dataset, pattern)).toBeTruthy();
    });

    it('should return false with non-matching named node resources', () => {
      const pattern = AF.createPattern(DF.namedNode('ex2:s'), DF.namedNode('ex:p'), DF.namedNode('ex2:o'));
      expect(matchPatternResourceUris(dataset, pattern)).toBeFalsy();
    });
  });

  describe('matchPatternVocabularies', () => {
    it('should return true without vocabularies', () => {
      expect(matchPatternVocabularies(<any>{}, <any>'pattern')).toBeTruthy();
    });

    it('should return true with variables', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
      expect(matchPatternVocabularies(dataset, pattern)).toBeTruthy();
    });

    it('should return true with matching named node predicate', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.variable('o'));
      expect(matchPatternVocabularies(dataset, pattern)).toBeTruthy();
    });

    it('should return false with non-matching named node predicate', () => {
      const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('ex2:p'), DF.variable('o'));
      expect(matchPatternVocabularies(dataset, pattern)).toBeFalsy();
    });
  });

  describe('getDistinctObjects', () => {
    it('should return void:distinctSubjects when available', () => {
      const distinctObjects = 321;
      const dataset = { distinctObjects };
      expect(getDistinctObjects(<any>dataset)).toBe(distinctObjects);
    });

    it('should fall back to void:entities when void:distinctObjects is unavailable', () => {
      const entities = 321;
      const dataset = { entities };
      expect(getDistinctObjects(<any>dataset)).toBe(entities);
    });

    it('should return dataset triple count with no data available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getDistinctObjects(<any>dataset)).toBe(datasetTripleCount);
    });
  });

  describe('getDistinctSubjects', () => {
    it('should return void:distinctSubjects when available', () => {
      const distinctSubjects = 321;
      const dataset = { distinctSubjects };
      expect(getDistinctSubjects(<any>dataset)).toBe(distinctSubjects);
    });

    it('should fall back to void:entities when void:distinctSubjects is unavailable', () => {
      const entities = 321;
      const dataset = { entities };
      expect(getDistinctSubjects(<any>dataset)).toBe(entities);
    });

    it('should return dataset triple count with no data available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getDistinctSubjects(<any>dataset)).toBe(datasetTripleCount);
    });
  });

  describe('getPredicateObjects', () => {
    const predicateUri = 'ex:p';
    const predicateTerm = DF.namedNode(predicateUri);

    it('should return dataset triple count with no property partitions available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getPredicateObjects(<any>dataset, predicateTerm)).toBe(datasetTripleCount);
    });

    it('should return 0 with no data available', () => {
      const dataset = { propertyPartitions: {}};
      expect(getPredicateObjects(<any>dataset, predicateTerm)).toBe(0);
    });

    it('should return void:distinctObjects from property partition when available', () => {
      const predicateObjects = 321;
      const dataset = { propertyPartitions: { [predicateUri]: { distinctObjects: predicateObjects }}};
      expect(getPredicateObjects(<any>dataset, predicateTerm)).toBe(predicateObjects);
    });
  });

  describe('getPredicateSubjects', () => {
    const predicateUri = 'ex:p';
    const predicateTerm = DF.namedNode(predicateUri);

    it('should return dataset triple count with no property partitions available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getPredicateSubjects(<any>dataset, predicateTerm)).toBe(datasetTripleCount);
    });

    it('should return 0 with no data available', () => {
      const dataset = { propertyPartitions: {}};
      expect(getPredicateSubjects(<any>dataset, predicateTerm)).toBe(0);
    });

    it('should return void:distinctSubjects from property partition when available', () => {
      const predicateSubjects = 321;
      const dataset = { propertyPartitions: { [predicateUri]: { distinctSubjects: predicateSubjects }}};
      expect(getPredicateSubjects(<any>dataset, predicateTerm)).toBe(predicateSubjects);
    });
  });

  describe('getPredicateTriples', () => {
    const predicateUri = 'ex:p';
    const predicateTerm = DF.namedNode(predicateUri);

    it('should return dataset triple count with no property partitions available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getPredicateTriples(<any>dataset, predicateTerm)).toBe(datasetTripleCount);
    });

    it('should return 0 with no data available', () => {
      const dataset = { propertyPartitions: {}};
      expect(getPredicateTriples(<any>dataset, predicateTerm)).toBe(0);
    });

    it('should return void:triples from property partition when available', () => {
      const predicateTriples = 321;
      const dataset = { propertyPartitions: { [predicateUri]: { triples: predicateTriples }}};
      expect(getPredicateTriples(<any>dataset, predicateTerm)).toBe(predicateTriples);
    });
  });

  describe('getClassPartitionEntities', () => {
    const classUri = 'ex:c';
    const classTerm = DF.namedNode(classUri);

    it('should return dataset triple count with no class partitions available', () => {
      const dataset = { triples: datasetTripleCount };
      expect(getClassPartitionEntities(<any>dataset, classTerm)).toBe(datasetTripleCount);
    });

    it('should return 0 with class partition but no class data', () => {
      const dataset = { classPartitions: {}};
      expect(getClassPartitionEntities(<any>dataset, classTerm)).toBe(0);
    });

    it('should return void:entities from class partition when present', () => {
      const classEntities = 321;
      const dataset = { classPartitions: { [classUri]: { entities: classEntities }}};
      expect(getClassPartitionEntities(<any>dataset, classTerm)).toBe(classEntities);
    });

    it('should fall back to void:entited and void:classes from dataset when available', () => {
      const datasetEntities = 200;
      const datasetClasses = 50;
      const dataset = { entities: datasetEntities, classes: datasetClasses };
      expect(getClassPartitionEntities(<any>dataset, classTerm)).toBe(datasetEntities / datasetClasses);
    });
  });

  describe('estimatePatternCardinalityRaw', () => {
    describe.each(Object.entries(patterns))('for patterns in the style of %s', (_, pattern) => {
      it('should handle cases with no relevant triples in the dataset', () => {
        const expected = (pattern.predicate.termType !== 'Variable' || pattern.predicate.value === rdfType.value) ?
          0 :
          datasetTripleCount;
        expect(estimatePatternCardinalityRaw(dataset, pattern)).toBe(expected);
      });

      it('should handle cases where formulae divisor goes to zero', () => {
        let expected = datasetTripleCount;
        // * <p> * should return predicate triples value
        if (pattern.predicate.termType === 'NamedNode') {
          dataset.propertyPartitions![pattern.predicate.value] = {
            triples: 321,
            distinctObjects: 0,
            distinctSubjects: 0,
          };
          expected = dataset.propertyPartitions![pattern.predicate.value].triples!;
        }
        // ?s rdf:type <o> should return class partition entities count
        if (pattern.predicate.value === RDF_TYPE) {
          dataset.classPartitions![pattern.object.value] = { entities: 987, propertyPartitions: {}};
          expected = dataset.classPartitions![pattern.object.value].entities!;
        }
        expect(estimatePatternCardinalityRaw(dataset, pattern)).toBe(expected);
      });

      it('should return a non-zero value when all the metrics are available', () => {
        if (pattern.predicate.termType === 'NamedNode') {
          dataset.propertyPartitions![pattern.predicate.value] = {
            distinctObjects: Math.random() * 20,
            distinctSubjects: Math.random() * 50,
            triples: 100 + Math.random() * 100,
          };
          if (pattern.predicate.value === RDF_TYPE) {
            dataset.classPartitions![pattern.object.value] = {
              entities: Math.random() * 200,
              propertyPartitions: {},
            };
          }
        }
        dataset.distinctObjects = 100 + Math.random() * 100;
        dataset.distinctSubjects = 200 + Math.random() * 50;
        expect(estimatePatternCardinalityRaw(dataset, pattern)).toBeGreaterThanOrEqual(0);
      });
    });

    describe.each(Object.entries(ignoredPatternExamples))('for patterns in the style of %s', (_, pattern) => {
      it('should return dataset triple count', () => {
        expect(estimatePatternCardinalityRaw(dataset, pattern)).toBe(datasetTripleCount);
      });
    });
  });
});
