import type { ActorInitQueryBase } from '@comunica/actor-init-query';
import { QueryEngineBase } from '@comunica/actor-init-query';
import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IDataset } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { termToString } from 'rdf-string-ttl';
import { VoidDataset } from './VoidDataset';

/**
 * A comunica Void RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractVoid extends ActorRdfMetadataExtract {
  private readonly queryEngine: QueryEngineBase;
  private readonly queryCacheSize: number;

  public static readonly VOID = 'http://rdfs.org/ns/void#';
  public static readonly SPARQL_SD = 'http://www.w3.org/ns/sparql-service-description#';

  public constructor(args: IActorRdfMetadataExtractVoidArgs) {
    super(args);
    this.queryEngine = new QueryEngineBase(args.actorInitQuery);
    this.queryCacheSize = args.queryCacheSize;
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const store = await this.collectFromMetadata(action.metadata);
    const datasets = await this.getDatasets(store, action.url);
    const metadata = datasets.length > 0 ? { datasets } : {};
    return { metadata };
  }

  /**
   * Collect all the VoID-related quads from the metadata stream.
   * The purpose of this is to avoid storing unrelated data present in the metadata stream.
   * @param {RDF.Stream} stream The metadata Quad stream.
   * @returns {RDF.Store} An RDF/JS in-memory store containing all the VoID-related quads.
   */
  public async collectFromMetadata(stream: RDF.Stream): Promise<RDF.Store> {
    return new Promise<RDF.Store>((resolve, reject) => {
      const store = RdfStore.createDefault();
      stream
        .on('error', reject)
        .on('end', () => resolve(store))
        .on('data', (quad: RDF.Quad) => {
          if (
            quad.predicate.value.startsWith(ActorRdfMetadataExtractVoid.VOID) ||
            quad.predicate.value.startsWith(ActorRdfMetadataExtractVoid.SPARQL_SD) ||
            quad.object.value.startsWith(ActorRdfMetadataExtractVoid.VOID) ||
            quad.object.value.startsWith(ActorRdfMetadataExtractVoid.SPARQL_SD)
          ) {
            store.addQuad(quad);
          }
        });
    });
  }

  public async getDatasets(store: RDF.Store, source: string): Promise<IDataset[]> {
    const datasets: IDataset[] = [];

    const query = `
      PREFIX void: <http://rdfs.org/ns/void#>
      PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

      SELECT DISTINCT ?identifier ?triples ?uriRegexPattern ?uriSpace WHERE {
        ?identifier rdf:type ?type .
        ?identifier void:triples ?triples .

        # Exclude intermediate SPARQL SD defaultDataset
        FILTER NOT EXISTS { ?service sd:defaultDataset ?identifier }

        # Exclude union default graphs as not actual graphs
        FILTER NOT EXISTS { ?identifier ^sd:defaultGraph/^sd:defaultDataset/sd:feature sd:UnionDefaultGraph }

        # Try to find the URI regex pattern on the dataset or the parent of it
        OPTIONAL { ?identifier ^sd:defaultGraph?/void:uriRegexPattern ?uriRegexPattern }

        # Try to find the uriSpace on the dataset or the parent of it
        OPTIONAL { ?identifier ^sd:defaultGraph?/void:uriSpace ?uriSpace }

        # By definition, sd:Graph and sd:Dataset are both also void:Datasets,
        # however sd:Dataset represents the dataset and not the graph
        VALUES ?type { sd:Graph void:Dataset }
      }
    `;

    const queryBindings = await this.queryEngine.queryBindings(query, { sources: [ store ]});

    for await (const bindings of queryBindings) {
      const identifier = bindings.get('identifier')!;
      if (identifier.termType === 'BlankNode' || identifier.termType === 'NamedNode') {
        let resourceUriPattern: RegExp | undefined;

        if (bindings.has('uriRegexPattern')) {
          resourceUriPattern = new RegExp(bindings.get('uriRegexPattern')!.value, 'u');
        } else if (bindings.has('uriSpace')) {
          resourceUriPattern = new RegExp(`^${bindings.get('uriSpace')?.value}`, 'u');
        }

        datasets.push(new VoidDataset({
          identifier,
          queryCacheSize: this.queryCacheSize,
          queryEngine: this.queryEngine,
          resourceUriPattern,
          source,
          store,
          triples: Number.parseInt(bindings.get('triples')!.value, 10),
          vocabularies: await this.getVocabularies(store, identifier),
        }));
      }
    }

    return datasets;
  }

  public async getVocabularies(
    store: RDF.Store,
    identifier: RDF.NamedNode | RDF.BlankNode,
  ): Promise<string[] | undefined> {
    const vocabularies: string[] = [];

    const query = `
      PREFIX void: <http://rdfs.org/ns/void#>
      PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>

      SELECT DISTINCT ?vocabulary WHERE {
        ${termToString(identifier)} ^sd:defaultGraph?/void:vocabulary ?vocabulary .
      }
    `;

    const bindingsStream = await this.queryEngine.queryBindings(query, { sources: [ store ]});

    for await (const bindings of bindingsStream) {
      vocabularies.push(bindings.get('vocabulary')!.value);
    }

    if (vocabularies.length > 0) {
      return vocabularies;
    }
  }
}

export interface IActorRdfMetadataExtractVoidArgs extends IActorRdfMetadataExtractArgs {
  /**
   * An init query actor that is used to query shapes.
   * @default {<urn:comunica:default:init/actors#query>}
   */
  actorInitQuery: ActorInitQueryBase;
  /**
   * The size for the query cache used in cardinality estimation to avoid repeat queries.
   * Each discovered VoID dataset will get its own cache, so this should not be too high.
   * @default {10}
   */
  queryCacheSize: number;
}
