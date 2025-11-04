import type { IActionQueryParse, IActorQueryParseArgs, IActorQueryParseOutput } from '@comunica/bus-query-parse';
import { ActorQueryParse } from '@comunica/bus-query-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser as SparqlParser } from '@traqula/parser-sparql-1-2';
import { AstFactory } from '@traqula/rules-sparql-1-2';

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorQueryParseSparql extends ActorQueryParse {
  public readonly prefixes: Record<string, string> | undefined;
  private readonly parser: SparqlParser;

  public constructor(args: IActorQueryParseSparqlArgs) {
    super(args);
    this.prefixes = Object.freeze(args.prefixes);
    this.parser = new SparqlParser({ lexerConfig: {
      positionTracking: 'onlyOffset',
    }});
  }

  public async test(action: IActionQueryParse): Promise<TestResult<IActorTest>> {
    if (action.queryFormat && action.queryFormat.language !== 'sparql') {
      return failTest('This actor can only parse SPARQL queries');
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryParse): Promise<IActorQueryParseOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const astFactory = new AstFactory();
    const parsedSyntax = this.parser.parse(action.query, {
      prefixes: this.prefixes,
      baseIRI: action.baseIRI,
      astFactory,
    });
    let baseIRI: string | undefined;
    if (astFactory.isQuery(parsedSyntax)) {
      for (const context of parsedSyntax.context) {
        if (astFactory.isContextDefinitionBase(context)) {
          baseIRI = context.value.value;
        }
      }
    }
    return {
      baseIRI,
      operation: toAlgebra(parsedSyntax, {
        quads: true,
        prefixes: this.prefixes,
        blankToVariable: true,
        baseIRI: action.baseIRI,
        dataFactory,
      }),
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
