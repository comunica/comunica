import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IDataset, QueryResultCardinality } from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
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
} from './Definitions';
import { estimatePatternCardinality } from './Estimators';
import type {
  IVoidClassPartition,
  IVoidDataset,
  IVoidPropertyPartition,
} from './Types';

/**
 * A comunica Void RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractVoid extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise<IActorRdfMetadataExtractOutput>((resolve, reject) => {
      // Track the URIs of identified datasets to extract or ignore
      const datasetUris = new Set<string>();
      const ignoredUris = new Set<string>();

      // Track the other stats per-URI to allow arbitrary triple ordering in the stream
      const triples: Record<string, number> = {};
      const entities: Record<string, number> = {};
      const vocabularies: Record<string, string[]> = {};
      const classes: Record<string, number> = {};
      const distinctObjects: Record<string, number> = {};
      const distinctSubjects: Record<string, number> = {};
      const uriRegexPatterns: Record<string, RegExp> = {};
      const propertyPartitions: Record<string, string[]> = {};
      const propertyPartitionProperties: Record<string, string> = {};
      const classPartitions: Record<string, string[]> = {};
      const classPartitionClasses: Record<string, string> = {};

      // Default dataset and graph to remove in case of sd:UnionDefaultGraph
      let defaultDatasetUri: string | undefined;
      let defaultGraphUri: string | undefined;
      let unionDefaultGraph = false;

      action.metadata
        .on('error', reject)
        .on('data', (quad: RDF.Quad) => {
          switch (quad.predicate.value) {
            case RDF_TYPE:
              if (quad.object.value === SD_GRAPH || quad.object.value === VOID_DATASET) {
                datasetUris.add(quad.subject.value);
              }
              break;
            case VOID_TRIPLES:
              triples[quad.subject.value] = Number.parseInt(quad.object.value, 10);
              break;
            case VOID_ENTITIES:
              entities[quad.subject.value] = Number.parseInt(quad.object.value, 10);
              break;
            case VOID_CLASSES:
              classes[quad.subject.value] = Number.parseInt(quad.object.value, 10);
              break;
            case VOID_CLASS:
              classPartitionClasses[quad.subject.value] = quad.object.value;
              break;
            case VOID_PROPERTY:
              propertyPartitionProperties[quad.subject.value] = quad.object.value;
              break;
            case VOID_DISTINCT_OBJECTS:
              distinctObjects[quad.subject.value] = Number.parseInt(quad.object.value, 10);
              break;
            case VOID_DISTINCT_SUBJECTS:
              distinctSubjects[quad.subject.value] = Number.parseInt(quad.object.value, 10);
              break;
            case VOID_VOCABULARY:
              if (vocabularies[quad.subject.value]) {
                vocabularies[quad.subject.value].push(quad.object.value);
              } else {
                vocabularies[quad.subject.value] = [ quad.object.value ];
              }
              break;
            case VOID_URI_SPACE:
              if (!uriRegexPatterns[quad.subject.value]) {
                uriRegexPatterns[quad.subject.value] = new RegExp(`^${quad.object.value}`, 'u');
              }
              break;
            case VOID_URI_REGEX_PATTERN:
              uriRegexPatterns[quad.subject.value] = new RegExp(quad.object.value, 'u');
              break;
            case VOID_PROPERTY_PARTITION:
              ignoredUris.add(quad.object.value);
              if (propertyPartitions[quad.subject.value]) {
                propertyPartitions[quad.subject.value].push(quad.object.value);
              } else {
                propertyPartitions[quad.subject.value] = [ quad.object.value ];
              }
              break;
            case VOID_CLASS_PARTITION:
              ignoredUris.add(quad.object.value);
              if (classPartitions[quad.subject.value]) {
                classPartitions[quad.subject.value].push(quad.object.value);
              } else {
                classPartitions[quad.subject.value] = [ quad.object.value ];
              }
              break;
            case SD_DEFAULT_DATASET:
              defaultDatasetUri = quad.object.value;
              break;
            case SD_DEFAULT_GRAPH:
              defaultGraphUri = quad.object.value;
              break;
            case SD_FEATURE:
              if (quad.object.value === SD_UNION_DEFAULT_GRAPH) {
                unionDefaultGraph = true;
              }
              break;
          }
        })
        .on('end', () => {
          const datasets: IDataset[] = [];

          // Helper function to extract property partitions into a map
          const getPropertyPartitions = (uri: string): Record<string, IVoidPropertyPartition> => {
            const partitions: Record<string, IVoidPropertyPartition> = {};
            for (const partitionUri of propertyPartitions[uri]) {
              const propertyUri = propertyPartitionProperties[partitionUri];
              if (propertyUri) {
                partitions[propertyUri] = {
                  distinctObjects: distinctObjects[partitionUri],
                  distinctSubjects: distinctSubjects[partitionUri],
                  triples: triples[partitionUri],
                };
              }
            }
            return partitions;
          };

          // Helper function to extract class partitions into a map
          const getClassPartitions = (uri: string): Record<string, IVoidClassPartition> => {
            const partitions: Record<string, IVoidClassPartition> = {};
            for (const partitionUri of classPartitions[uri]) {
              const classUri = classPartitionClasses[partitionUri];
              if (classUri) {
                partitions[classUri] = {
                  entities: entities[partitionUri],
                  propertyPartitions: propertyPartitions[partitionUri] ?
                    getPropertyPartitions(partitionUri) :
                    undefined,
                };
              }
            }
            return partitions;
          };

          // Always ignore intermediate default dataset
          if (defaultDatasetUri) {
            ignoredUris.add(defaultDatasetUri);
          }

          // Ignore default graph URI when union default graph is set
          if (unionDefaultGraph && defaultGraphUri) {
            ignoredUris.add(defaultGraphUri);
          }

          // Propagate vocabularies from higher level datasets to lower-level
          if (defaultDatasetUri && defaultGraphUri && vocabularies[defaultDatasetUri]) {
            vocabularies[defaultGraphUri] = [
              ...vocabularies[defaultGraphUri] ?? [],
              ...vocabularies[defaultDatasetUri],
            ];
          }

          // Delete all the to-be-ignored datasets, such as property and class partitions
          for (const uri of ignoredUris) {
            datasetUris.delete(uri);
          }

          for (const uri of datasetUris) {
            // Only the VoID descriptions with triple counts and class or property partitions are actually useful,
            // and any other ones would contain insufficient information to use in estimation, as the formulae
            // would go to 0 for most estimations.
            if (triples[uri]) {
              const dataset: IVoidDataset = {
                entities: entities[uri],
                identifier: uri,
                classes: classes[uri] ?? classPartitions[uri]?.length ?? 0,
                classPartitions: classPartitions[uri] ? getClassPartitions(uri) : undefined,
                distinctObjects: distinctObjects[uri],
                distinctSubjects: distinctSubjects[uri],
                propertyPartitions: propertyPartitions[uri] ? getPropertyPartitions(uri) : undefined,
                triples: triples[uri],
                uriRegexPattern: uriRegexPatterns[uri],
                vocabularies: vocabularies[uri],
              };
              datasets.push({
                uri,
                source: action.url,
                getCardinality: async(operation: Algebra.Operation): Promise<QueryResultCardinality | undefined> => {
                  if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
                    return { ...estimatePatternCardinality(dataset, operation), dataset: uri };
                  }
                },
              });
            }
          }

          resolve({ metadata: datasets.length > 0 ? { datasets } : {}});
        });
    });
  }
}
