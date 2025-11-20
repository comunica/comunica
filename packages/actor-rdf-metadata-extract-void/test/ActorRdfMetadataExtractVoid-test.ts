import { Bus } from '@comunica/core';
import type { IDataset } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { streamifyArray } from 'streamify-array';
import { ActorRdfMetadataExtractVoid } from '../lib/ActorRdfMetadataExtractVoid';
import '@comunica/utils-jest';
import {
  RDF_TYPE,
  SD_DEFAULT_DATASET,
  SD_DEFAULT_GRAPH,
  SD_FEATURE,
  SD_GRAPH,
  SD_UNION_DEFAULT_GRAPH,
  VOID_CLASS,
  VOID_CLASS_PARTITION,
  VOID_CLASSES,
  VOID_DATASET,
  VOID_DISTINCT_OBJECTS,
  VOID_DISTINCT_SUBJECTS,
  VOID_ENTITIES,
  VOID_PROPERTY,
  VOID_PROPERTY_PARTITION,
  VOID_TRIPLES,
  VOID_URI_REGEX_PATTERN,
  VOID_URI_SPACE,
  VOID_VOCABULARY,
} from '../lib/Definitions';

jest.mock('@comunica/actor-init-query');
jest.mock('@comunica/bus-rdf-metadata-extract');

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ActorRdfMetadataExtractVoid', () => {
  let bus: any;
  let actor: ActorRdfMetadataExtractVoid;

  const sparqlEndpoint = DF.namedNode('http://localhost:3000/sparql');

  beforeEach(() => {
    jest.resetAllMocks();
    bus = new Bus({ name: 'bus' });
    actor = new ActorRdfMetadataExtractVoid({
      bus,
      name: 'actor',
    });
  });

  describe('test', () => {
    it('should test', async() => {
      await expect(actor.test(<any> {})).resolves.toBeTruthy();
    });
  });

  describe('run', () => {
    it('should ignore empty metadata stream', async() => {
      const metadata = streamifyArray([]);
      await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({ metadata: {}});
    });

    describe.each([
      [ 'void:Dataset', VOID_DATASET ],
      [ 'sd:Graph', SD_GRAPH ],
    ])('with dataset type %s', (_, typeUri) => {
      it('should ignore datasets without triple count', async() => {
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(typeUri)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASSES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_DISTINCT_OBJECTS), DF.literal('567')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_DISTINCT_SUBJECTS), DF.literal('345')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_URI_SPACE), DF.literal('http://localhost/')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_URI_REGEX_PATTERN), DF.literal('^http://localhost/.*')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_VOCABULARY), DF.namedNode('ex:v1')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_VOCABULARY), DF.namedNode('ex:v2')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({ metadata: {}});
      });

      it('should parse datasets with only triple count', async() => {
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: sparqlEndpoint.value,
              },
            ],
          },
        });
      });

      it('should prefer VOID_URI_REGEX_PATTERN over VOID_URI_SPACE', async() => {
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(typeUri)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASSES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_DISTINCT_OBJECTS), DF.literal('567')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_DISTINCT_SUBJECTS), DF.literal('345')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_URI_REGEX_PATTERN), DF.literal('^http://localhost/.*')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_URI_SPACE), DF.literal('http://localhost/')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: sparqlEndpoint.value,
              },
            ],
          },
        });
      });

      it('should drop virtual sd:defaultGraph when sd:UnionDefaultGraph is declared', async() => {
        const defaultGraph = DF.namedNode('ex:defaultGraph');
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(SD_DEFAULT_GRAPH), defaultGraph),
          DF.quad(sparqlEndpoint, DF.namedNode(SD_FEATURE), DF.namedNode(SD_UNION_DEFAULT_GRAPH)),
          DF.quad(defaultGraph, DF.namedNode(RDF_TYPE), DF.namedNode(typeUri)),
          DF.quad(defaultGraph, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({ metadata: {}});
      });

      it('should drop intermediate sd:defaultDataset and propagate its vocabularies to sd:defaultGraph', async() => {
        const defaultDataset = DF.namedNode('ex:defaultDataset');
        const defaultGraph = DF.namedNode('ex:defaultGraph');
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(SD_DEFAULT_DATASET), defaultDataset),
          DF.quad(defaultDataset, DF.namedNode(VOID_TRIPLES), DF.literal('9876')),
          DF.quad(defaultDataset, DF.namedNode(VOID_VOCABULARY), DF.namedNode('ex:v')),
          DF.quad(defaultDataset, DF.namedNode(SD_DEFAULT_GRAPH), defaultGraph),
          DF.quad(defaultGraph, DF.namedNode(RDF_TYPE), DF.namedNode(typeUri)),
          DF.quad(defaultGraph, DF.namedNode(VOID_TRIPLES), DF.literal('4657')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: defaultGraph.value,
              },
            ],
          },
        });
      });

      it('should produce datasets with cardinality estimation capability', async() => {
        const tripleCount = 1234;
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal(tripleCount.toString())),
        ]);
        const dataset: IDataset | undefined = (await actor.run(<any>{
          metadata,
          url: sparqlEndpoint.value,
        }))?.metadata?.datasets.at(0);
        expect(dataset).toBeDefined();
        const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
        await expect(dataset!.getCardinality(pattern)).resolves.toEqual({
          type: 'estimate',
          value: tripleCount,
          dataset: sparqlEndpoint.value,
        });
        await expect(dataset!.getCardinality(AF.createNop())).resolves.toBeUndefined();
      });

      it('should parse datasets with void:propertyPartition', async() => {
        const propertyPartition = DF.blankNode();
        const propertyPartitionProperty = DF.namedNode('ex:p');
        const propertyPartitionTriples = 5724;
        const emptyPropertyPartition = DF.blankNode();
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_PROPERTY_PARTITION), propertyPartition),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_PROPERTY_PARTITION), emptyPropertyPartition),
          DF.quad(propertyPartition, DF.namedNode(VOID_PROPERTY), propertyPartitionProperty),
          DF.quad(propertyPartition, DF.namedNode(VOID_TRIPLES), DF.literal(propertyPartitionTriples.toString())),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: sparqlEndpoint.value,
              },
            ],
          },
        });
      });

      it('should parse datasets with void:classPartition', async() => {
        const classUri = DF.namedNode('ex:C');
        const classPartition = DF.blankNode();
        const classPartitionEntities = 4321;
        const emptyClassPartition = DF.blankNode();
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASS_PARTITION), classPartition),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASS_PARTITION), emptyClassPartition),
          DF.quad(classPartition, DF.namedNode(VOID_ENTITIES), DF.literal(classPartitionEntities.toString())),
          DF.quad(classPartition, DF.namedNode(VOID_CLASS), classUri),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: sparqlEndpoint.value,
              },
            ],
          },
        });
      });

      it('should parse datasets with void:classPartition and nested void:propertyPartition', async() => {
        const classUri = DF.namedNode('ex:C');
        const classPartition = DF.blankNode();
        const classPartitionEntities = 4321;
        const emptyClassPartition = DF.blankNode();
        const propertyPartition = DF.blankNode();
        const propertyPartitionProperty = DF.namedNode('ex:p');
        const metadata = streamifyArray([
          DF.quad(sparqlEndpoint, DF.namedNode(RDF_TYPE), DF.namedNode(VOID_DATASET)),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_TRIPLES), DF.literal('1234')),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASS_PARTITION), classPartition),
          DF.quad(sparqlEndpoint, DF.namedNode(VOID_CLASS_PARTITION), emptyClassPartition),
          DF.quad(classPartition, DF.namedNode(VOID_ENTITIES), DF.literal(classPartitionEntities.toString())),
          DF.quad(classPartition, DF.namedNode(VOID_CLASS), classUri),
          DF.quad(classPartition, DF.namedNode(VOID_PROPERTY_PARTITION), propertyPartition),
          DF.quad(propertyPartition, DF.namedNode(VOID_PROPERTY), propertyPartitionProperty),
          DF.quad(propertyPartition, DF.namedNode(VOID_TRIPLES), DF.literal('5678')),
        ]);
        await expect(actor.run(<any>{ metadata, url: sparqlEndpoint.value })).resolves.toEqual({
          metadata: {
            datasets: [
              {
                getCardinality: expect.any(Function),
                source: sparqlEndpoint.value,
                uri: sparqlEndpoint.value,
              },
            ],
          },
        });
      });
    });
  });
});
