import type { ActorInitQueryBase } from '@comunica/actor-init-query';
import { QueryEngineBase } from '@comunica/actor-init-query';
import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { storeStream } from 'rdf-store-stream';
import { VoidCardinalityProvider } from './VoidCardinalityProvider';

/**
 * A comunica Void RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractVoid extends ActorRdfMetadataExtract {
  public readonly queryEngine: QueryEngineBase;

  public constructor(args: IActorRdfMetadataExtractVoidArgs) {
    super(args);
    this.queryEngine = new QueryEngineBase(args.actorInitQuery);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadataStore = await storeStream(action.metadata);

    const voidDescription: IVoidDescription = {
      graphs: {},
      unionDefaultGraph: await this.queryEngine.queryBoolean(`
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        ASK WHERE {
          <${action.url}> a sd:Service;
            sd:feature sd:UnionDefaultGraph.
        }`, {
        sources: [ metadataStore ],
      }),
    };

    // Collect default and named graphs
    const bindingsGraphs = await (await this.queryEngine.queryBindings(`
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT * WHERE {
          <${action.url}> a sd:Service;
            sd:defaultDataset ?defaultDataset.

          ?defaultDataset sd:defaultGraph ?defaultGraph;
            sd:namedGraph ?namedGraph.
          
          ?defaultGraph void:triples ?defaultGraphTriples.
          ?namedGraph sd:graph ?namedGraphVoid.
          ?namedGraphVoid void:triples ?namedGraphTriples.
          
          OPTIONAL { ?defaultGraph void:distinctSubjects ?defaultDistinctSubjects }
          OPTIONAL { ?defaultGraph void:distinctObjects ?defaultDistinctObjects }
          
          OPTIONAL { ?namedGraphVoid void:distinctSubjects ?namedGraphDistinctSubjects }
          OPTIONAL { ?namedGraphVoid void:distinctObjects ?namedGraphDistinctObjects }
        }`, {
      sources: [ metadataStore ],
    })).toArray();

    for (const bindings of bindingsGraphs) {
      if (!voidDescription.graphs.DEFAULT) {
        const defaultPropertyPartitions = await this.getPropertyPartitions(action.url, 'DEFAULT', metadataStore);
        voidDescription.graphs.DEFAULT = {
          triples: Number.parseInt(bindings.get('defaultGraphTriples')!.value, 10),
          propertyPartitions: defaultPropertyPartitions,
          classPartitions: await this.getClassPartitions(action.url, 'DEFAULT', metadataStore),
          distinctSubjects: this.estimateDistinct(
            bindings.get('defaultDistinctSubjects')?.value,
            defaultPropertyPartitions,
            'subjects',
          ),
          distinctObjects: this.estimateDistinct(
            bindings.get('defaultDistinctObjects')?.value,
            defaultPropertyPartitions,
            'objects',
          ),
        };
      }

      const namedGraphPropertyPartitions = await this.getPropertyPartitions(
        action.url,
        bindings.get('namedGraph')!.value,
        metadataStore,
      );
      voidDescription.graphs[bindings.get('namedGraph')!.value] = {
        triples: Number.parseInt(bindings.get('namedGraphTriples')!.value, 10),
        propertyPartitions: namedGraphPropertyPartitions,
        classPartitions: await this.getClassPartitions(
          action.url,
          bindings.get('namedGraph')!.value,
          metadataStore,
        ),
        distinctSubjects: this.estimateDistinct(
          bindings.get('namedGraphDistinctSubjects')?.value,
          namedGraphPropertyPartitions,
          'subjects',
        ),
        distinctObjects: this.estimateDistinct(
          bindings.get('namedGraphDistinctObjects')?.value,
          namedGraphPropertyPartitions,
          'objects',
        ),
      };
    }

    // If void is incomplete, don't return it in the metadata
    if (Object.keys(voidDescription.graphs).length === 0) {
      return { metadata: {}};
    }

    return {
      metadata: {
        voidDescription,
        voidCardinalityProvider: new VoidCardinalityProvider(voidDescription),
      },
    };
  }

  public async getPropertyPartitions(
    endpoint: string,
    graph: string | 'DEFAULT',
    store: RDF.Store,
  ): Promise<Record<string, IVoidPropertyPartition>> {
    const partitions: Record<string, IVoidPropertyPartition> = {};

    const query: string = graph === 'DEFAULT' ?
      `
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT * WHERE {
          <${endpoint}> a sd:Service;
            sd:defaultDataset ?defaultDataset.

          ?defaultDataset sd:defaultGraph ?defaultGraph.
        
          ?defaultGraph void:propertyPartition ?partition.
          
          ?partition void:property ?property ;
            void:triples ?triples ;
            void:distinctSubjects ?distinctSubjects ;
            void:distinctObjects ?distinctObjects .
        }` :
`
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT * WHERE {
          <${graph}> sd:graph [ void:propertyPartition ?partition ] .
          
          ?partition void:property ?property ;
            void:triples ?triples ;
            void:distinctSubjects ?distinctSubjects ;
            void:distinctObjects ?distinctObjects .
        }`;

    // Collect default and named graphs
    const bindingsGraphs = await (await this.queryEngine.queryBindings(query, {
      sources: [ store ],
    })).toArray();

    for (const bindings of bindingsGraphs) {
      partitions[bindings.get('property')!.value] = {
        triples: Number.parseInt(bindings.get('triples')!.value, 10),
        distinctSubjects: Number.parseInt(bindings.get('distinctSubjects')!.value, 10),
        distinctObjects: Number.parseInt(bindings.get('distinctObjects')!.value, 10),
      };
    }

    return partitions;
  }

  public async getClassPartitions(
    endpoint: string,
    graph: string | 'DEFAULT',
    store: RDF.Store,
  ): Promise<Record<string, IVoidClassPartition>> {
    const partitions: Record<string, IVoidClassPartition> = {};

    const query: string = graph === 'DEFAULT' ?
      `
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT * WHERE {
          <${endpoint}> a sd:Service;
            sd:defaultDataset ?defaultDataset.

          ?defaultDataset sd:defaultGraph ?defaultGraph.
        
          ?defaultGraph void:classPartition ?partition.
          
          ?partition void:class ?class ;
            void:entities ?entities .
        }` :
      `
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT * WHERE {
          <${graph}> sd:graph [ void:classPartition ?partition ] .
          
          ?partition void:class ?class ;
            void:entities ?entities .
        }`;

    // Collect default and named graphs
    const bindingsGraphs = await (await this.queryEngine.queryBindings(query, {
      sources: [ store ],
    })).toArray();

    for (const bindings of bindingsGraphs) {
      partitions[bindings.get('class')!.value] = {
        entities: Number.parseInt(bindings.get('entities')!.value, 10),
      };
    }

    // If we find no class partitions,
    // fallback to taking the sum of all predicate partition triples in each class partitions.
    if (bindingsGraphs.length === 0) {
      return await this.getClassPartitionsFallback(endpoint, graph, store);
    }

    return partitions;
  }

  public async getClassPartitionsFallback(
    endpoint: string,
    graph: string | 'DEFAULT',
    store: RDF.Store,
  ): Promise<Record<string, IVoidClassPartition>> {
    const partitions: Record<string, IVoidClassPartition> = {};

    const query: string = graph === 'DEFAULT' ?
      `
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT ?class (SUM(?classPropertyPartitionTriples) as ?entities) WHERE {
          <${endpoint}> a sd:Service;
            sd:defaultDataset ?defaultDataset.

          ?defaultDataset sd:defaultGraph ?defaultGraph.
        
          ?defaultGraph void:classPartition ?partition.
          
          ?partition void:class ?class ;
            void:propertyPartition ?classPropertyPartition .
          ?classPropertyPartition void:triples ?classPropertyPartitionTriples.
        } GROUP BY ?class` :
      `
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT ?class (SUM(?classPropertyPartitionTriples) as ?entities) WHERE {
          <${graph}> sd:graph [ void:classPartition ?partition ] .
          
          ?partition void:class ?class ;
            void:propertyPartition ?classPropertyPartition .
          ?classPropertyPartition void:triples ?classPropertyPartitionTriples.
        } GROUP BY ?class`;

    // Collect default and named graphs
    const bindingsGraphs = await (await this.queryEngine.queryBindings(query, {
      sources: [ store ],
    })).toArray();

    for (const bindings of bindingsGraphs) {
      partitions[bindings.get('class')!.value] = {
        entities: Number.parseInt(bindings.get('entities')!.value, 10),
      };
    }

    return partitions;
  }

  public estimateDistinct(
    value: string | undefined,
    propertyPartitions: Record<string, IVoidPropertyPartition>,
    target: 'subjects' | 'objects',
  ): number {
    if (value !== undefined) {
      return Number.parseInt(value, 10);
    }

    let sum = 0;
    for (const partition of Object.values(propertyPartitions)) {
      sum += target === 'subjects' ? partition.distinctSubjects : partition.distinctObjects;
    }
    return sum;
  }
}

export interface IActorRdfMetadataExtractVoidArgs extends IActorRdfMetadataExtractArgs {
  /**
   * An init query actor that is used to query shapes.
   * @default {<urn:comunica:default:init/actors#query>}
   */
  actorInitQuery: ActorInitQueryBase;
}

export interface IVoidDescription {
  graphs: Record<string | 'DEFAULT', IVoidGraph>;
  unionDefaultGraph: boolean;
}

export interface IVoidGraph {
  triples: number;
  propertyPartitions: Record<string, IVoidPropertyPartition>;
  classPartitions: Record<string, IVoidClassPartition>;
  distinctSubjects: number;
  distinctObjects: number;
}

export interface IVoidPropertyPartition {
  triples: number;
  distinctSubjects: number;
  distinctObjects: number;
}

export interface IVoidClassPartition {
  entities: number;
}

export interface IVoidCardinalityProvider {
  getCardinality: (
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ) => RDF.QueryResultCardinality;
}
