import type { IActionQueryParse, IActorQueryParseArgs, IActorQueryParseOutput } from '@comunica/bus-query-parse';
import { ActorQueryParse } from '@comunica/bus-query-parse';
import type { IActorTest } from '@comunica/core';
import { translate } from 'sparqlalgebrajs';
import { Parser as SparqlParser } from 'sparqljs';

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorQueryParseSparql extends ActorQueryParse {
  public readonly prefixes: Record<string, string>;

  public constructor(args: IActorQueryParseSparqlArgs) {
    super(args);
    this.prefixes = Object.freeze(this.prefixes);
  }

  public async test(action: IActionQueryParse): Promise<IActorTest> {
    if (action.queryFormat && action.queryFormat.language !== 'sparql') {
      throw new Error('This actor can only parse SPARQL queries');
    }
    return true;
  }

  public async run(action: IActionQueryParse): Promise<IActorQueryParseOutput> {
    const parser = new SparqlParser({ prefixes: this.prefixes, baseIRI: action.baseIRI });
    const parsedSyntax = parser.parse(action.query);
    const baseIRI = parsedSyntax.type === 'query' ? parsedSyntax.base : undefined;
    return {
      baseIRI,
      operation: translate(parsedSyntax,
        { quads: true, prefixes: this.prefixes, blankToVariable: true, baseIRI: action.baseIRI }),
    };
  }
}

export interface IActorQueryParseSparqlArgs extends IActorQueryParseArgs {
  /**
   * Default prefixes to use
   * @range {json}
   * @default {{
   *   "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
   *   "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
   *   "owl": "http://www.w3.org/2002/07/owl#",
   *   "xsd": "http://www.w3.org/2001/XMLSchema#",
   *   "dc": "http://purl.org/dc/terms/",
   *   "dcterms": "http://purl.org/dc/terms/",
   *   "dc11": "http://purl.org/dc/elements/1.1/",
   *   "foaf": "http://xmlns.com/foaf/0.1/",
   *   "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
   *   "dbpedia": "http://dbpedia.org/resource/",
   *   "dbpedia-owl": "http://dbpedia.org/ontology/",
   *   "dbpprop": "http://dbpedia.org/property/",
   *   "schema": "http://schema.org/",
   *   "skos": "http://www.w3.org/2008/05/skos#"
   * }}
   */
  prefixes?: Record<string, string>;
}
