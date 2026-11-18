/* eslint-disable import/no-nodejs-modules,ts/no-require-imports,ts/no-var-requires */
import type * as http from 'node:http';
import type { Writable } from 'node:stream';
import type * as RDF from '@rdfjs/types';

import { termToString } from 'rdf-string';
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
    const graph = '_:defaultGraph';

    // All statistics are computed in a single pass over the triples,
    // as separate aggregate queries each keep their own state, which does not fit in memory for larger datasets.
    // They all describe the default graph, as the default dataset only refers to it.
    let triples = 0;
    let entities = 0;
    const distinctSubjects = new Set<string>();
    const distinctObjects = new Set<string>();
    const propertyStatistics = new Map<string, { triples: number; subjects: Set<string>; objects: Set<string> }>();
    const classEntities = new Map<string, { class: RDF.Term; count: number }>();
    const bindingsStream = await engine.queryBindings('SELECT ?s ?p ?o WHERE { ?s ?p ?o }', this.context);
    for await (const bindings of bindingsStream) {
      const subject = bindings.get('s')!;
      const predicate = bindings.get('p')!;
      const object = bindings.get('o')!;
      triples++;
      if (subject.termType === 'NamedNode') {
        entities++;
      }
      const subjectKey = termToString(subject);
      const objectKey = termToString(object);
      distinctSubjects.add(subjectKey);
      distinctObjects.add(objectKey);
      let propertyEntry = propertyStatistics.get(predicate.value);
      if (!propertyEntry) {
        propertyEntry = { triples: 0, subjects: new Set(), objects: new Set() };
        propertyStatistics.set(predicate.value, propertyEntry);
      }
      propertyEntry.triples++;
      propertyEntry.subjects.add(subjectKey);
      propertyEntry.objects.add(objectKey);
      if (predicate.value === rdfType) {
        const classEntry = classEntities.get(objectKey);
        if (classEntry) {
          classEntry.count++;
        } else {
          classEntities.set(objectKey, { class: object, count: 1 });
        }
      }
    }

    const xsdInteger = (n: number): string =>
      `"${n}"^^http://www.w3.org/2001/XMLSchema#integer`;

    this.cachedStatistics.push(
      quad(graph, `${vd}triples`, xsdInteger(triples)),
      quad(graph, `${vd}entities`, xsdInteger(entities)),
      quad(graph, `${vd}distinctSubjects`, xsdInteger(distinctSubjects.size)),
      quad(graph, `${vd}properties`, xsdInteger(propertyStatistics.size)),
      quad(graph, `${vd}distinctObjects`, xsdInteger(distinctObjects.size)),
      quad(graph, `${vd}classes`, xsdInteger(classEntities.size)),
    );
    let i = 0;
    for (const { class: classTerm, count } of classEntities.values()) {
      const classPartition = `_:classPartition${i++}`;
      this.cachedStatistics.push(
        quad(graph, `${vd}classPartition`, classPartition),
        quad(classPartition, rdfType, `${vd}ClassPartition`),
        quad(classPartition, `${vd}class`, classTerm.value),
        quad(classPartition, `${vd}entities`, xsdInteger(count)),
      );
    }
    i = 0;
    for (const [ property, { triples: count, subjects, objects }] of propertyStatistics) {
      const propertyPartition = `_:propertyPartition${i++}`;
      this.cachedStatistics.push(
        quad(graph, `${vd}propertyPartition`, propertyPartition),
        quad(propertyPartition, rdfType, `${vd}PropertyPartition`),
        quad(propertyPartition, `${vd}property`, property),
        quad(propertyPartition, `${vd}triples`, xsdInteger(count)),
        quad(propertyPartition, `${vd}distinctSubjects`, xsdInteger(subjects.size)),
        quad(propertyPartition, `${vd}distinctObjects`, xsdInteger(objects.size)),
      );
    }
  }
}
