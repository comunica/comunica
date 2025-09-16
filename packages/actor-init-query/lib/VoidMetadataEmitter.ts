/* eslint-disable import/no-nodejs-modules,ts/no-require-imports,ts/no-var-requires */
import type * as http from 'node:http';
import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';

import type { QueryEngineBase } from '..';

const quad = require('rdf-quad');

/**
 * A VoID metadata emitter that emits metadata used in VoID description of the HTTP service sparql endpoint.
 */
export class VoidMetadataEmitter {
  private static readonly STRING_LITERALS = new Set([
    'alternative',
    'description',
    'title',
  ]);

  private static readonly DATE_LITERALS = new Set([
    'available',
    'created',
    'date',
    'dateAccepted',
    'dateCopyrighted',
    'dateSubmitted',
    'issued',
    'modified',
    'valid',
  ]);

  public readonly context: any;
  public cachedStatistics: RDF.Quad[] = [];

  public constructor(
    context: any,
  ) {
    this.context = context;
  }

  public invalidateCache(): void {
    this.cachedStatistics = [];
  }

  /**
   * Returns a list of all necessary VoID quads.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {module:stream.internal.Writable} stdout
   * @param {module:http.IncomingMessage} request
   * @param {module:http.ServerResponse} response
   */
  public async getVoIDQuads(
    engine: QueryEngineBase,
    stdout: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<RDF.Quad[]> {
    const s = request.url;
    const sd = 'http://www.w3.org/ns/sparql-service-description#';
    const vd = 'http://rdfs.org/ns/void#';
    const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    const rdfType = `${rdf}type`;
    const dataset = '_:defaultDataset';
    const graph = '_:defaultGraph';
    const vocabulary = `${vd}vocabulary`;
    const dcterms = 'http://purl.org/dc/terms/';
    const quads: RDF.Quad[] = [
      quad(s, `${sd}defaultDataset`, dataset),
      quad(dataset, rdfType, `${sd}Dataset`),

      // Basic VoID metadata
      quad(dataset, rdfType, `${vd}Dataset`),
      quad(dataset, `${vd}sparqlEndpoint`, '/sparql'),
    ];

    // Dublin Core Metadata Terms
    if (this.context.dcterms) {
      quads.push(quad(dataset, vocabulary, dcterms));
      for (const key in this.context.dcterms) {
        quads.push(quad(dataset, `${dcterms}${key}`, this.convertValue(key, this.context.dcterms[key])));
      }
    }

    // Statistics

    // Default graph for statistics
    quads.push(quad(dataset, `${sd}defaultGraph`, graph));
    quads.push(quad(graph, rdfType, `${sd}Graph`));

    if (this.cachedStatistics.length === 0) {
      try {
        await this.fetchVoIDStatistics(engine);
      } catch (error: any) {
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        response.end('An internal server error occurred.\n');
        return [];
      }
    }

    for (const q of this.cachedStatistics) {
      quads.push(q);
    }

    return quads;
  }

  private convertValue(
    key: string,
    value: string,
  ): string {
    if (VoidMetadataEmitter.STRING_LITERALS.has(key)) {
      return `"${value}"`;
    }
    if (VoidMetadataEmitter.DATE_LITERALS.has(key)) {
      return `"${value}"^^http://www.w3.org/2001/XMLSchema#date`;
    }
    return value;
  }

  /**
   * Fetches the necessary VoID statistics quads and assigns them to this.cachedStatistics
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @private
   */
  private async fetchVoIDStatistics(
    engine: QueryEngineBase,
  ): Promise<void> {
    const vd = 'http://rdfs.org/ns/void#';
    const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    const rdfType = `${rdf}type`;
    const dataset = '_:defaultDataset';
    const graph = '_:defaultGraph';

    const [ globalStatistics, classesStatistic, classPartitions, propertyPartitions ] = await Promise.all([
      engine.queryBindings(
        `
SELECT
  (COUNT(*) AS ?triples)
  (SUM(IF(isIRI(?s), 1, 0)) AS ?entities)
  (COUNT(DISTINCT ?s) AS ?distinctSubjects)
  (COUNT(DISTINCT ?p) AS ?properties)
  (COUNT(DISTINCT ?o) AS ?distinctObjects)
WHERE {
  ?s ?p ?o
}
    `,
        this.context,
      ),
      engine.queryBindings(
        `
SELECT
  (COUNT(DISTINCT ?c) AS ?classes)
WHERE {
  ?s a ?c
}
    `,
        this.context,
      ),
      engine.queryBindings(
        `
SELECT ?class (COUNT(*) AS ?count)
WHERE { ?s a ?class }
GROUP BY ?class
    `,
        this.context,
      ),
      engine.queryBindings(
        `
SELECT ?property (COUNT(*) AS ?count)
WHERE { ?s ?property ?o }
GROUP BY ?property
    `,
        this.context,
      ),
    ]);

    const xsdInteger = (n: string): string =>
      `"${n}"^^http://www.w3.org/2001/XMLSchema#integer`;

    await Promise.all([
      (async(): Promise<void> => {
        for await (const bindings of globalStatistics) {
          this.cachedStatistics.push(quad(graph, `${vd}triples`, xsdInteger(bindings.get('triples')!.value)));
          this.cachedStatistics.push(quad(graph, `${vd}entities`, xsdInteger(bindings.get('entities')!.value)));
          this.cachedStatistics.push(quad(graph, `${vd}distinctSubjects`, xsdInteger(bindings.get('distinctSubjects')!.value)));
          this.cachedStatistics.push(quad(graph, `${vd}properties`, xsdInteger(bindings.get('properties')!.value)));
          this.cachedStatistics.push(quad(graph, `${vd}distinctObjects`, xsdInteger(bindings.get('distinctObjects')!.value)));
        }
      })(),
      (async(): Promise<void> => {
        for await (const bindings of classesStatistic) {
          this.cachedStatistics.push(quad(graph, `${vd}classes`, xsdInteger(bindings.get('classes')!.value)));
        }
      })(),
      (async(): Promise<void> => {
        let i = 0;
        for await (const bindings of classPartitions) {
          const classPartition = `_:classPartition${i}`;
          this.cachedStatistics.push(quad(dataset, `${vd}classPartition`, classPartition));
          this.cachedStatistics.push(quad(classPartition, rdfType, `${vd}ClassPartition`));
          this.cachedStatistics.push(quad(classPartition, `${vd}class`, bindings.get('class')!.value));
          this.cachedStatistics.push(quad(classPartition, `${vd}entities`, xsdInteger(bindings.get('count')!.value)));
          i++;
        }
      })(),
      (async(): Promise<void> => {
        let i = 0;
        for await (const bindings of propertyPartitions) {
          const propertyPartition = `_:propertyPartition${i}`;
          this.cachedStatistics.push(quad(dataset, `${vd}propertyPartition`, propertyPartition));
          this.cachedStatistics.push(quad(propertyPartition, rdfType, `${vd}PropertyPartition`));
          this.cachedStatistics.push(quad(propertyPartition, `${vd}property`, bindings.get('property')!.value));
          this.cachedStatistics.push(quad(propertyPartition, `${vd}triples`, xsdInteger(bindings.get('count')!.value)));
          i++;
        }
      })(),
    ]);
  }
}
