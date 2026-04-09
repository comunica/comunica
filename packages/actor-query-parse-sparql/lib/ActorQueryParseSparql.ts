import type { IActionQueryParse, IActorQueryParseArgs, IActorQueryParseOutput } from '@comunica/bus-query-parse';
import { ActorQueryParse } from '@comunica/bus-query-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { toAlgebra, toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import { sparql12ParserBuilder } from '@traqula/parser-sparql-1-2';
import { sparqlCodepointEscape } from '@traqula/rules-sparql-1-1';
import type { SparqlQuery } from '@traqula/rules-sparql-1-2';
import { lex, completeParseContext, copyParseContext, AstFactory } from '@traqula/rules-sparql-1-2';
import { constructQueryWithQuads } from './constructQueryQuadsPatch';

// Build a patched parser that supports GRAPH clauses in CONSTRUCT templates.
const patchedParserBuilder = sparql12ParserBuilder.patchRule(<any>constructQueryWithQuads);

// Build the algebra transformer once (reused across all parse calls).
const algebraTransformer = toAlgebra12Builder.build();

/**
 * Find the CONSTRUCT operation inside an algebra tree (possibly wrapped in Slice/From/etc.)
 * and replace its template with the provided quad patterns.
 */
function replaceConstructTemplate(operation: any, patterns: any[]): void {
  if (operation.type === 'construct') {
    operation.template = patterns;
  } else if (operation.input) {
    replaceConstructTemplate(operation.input, patterns);
  }
}

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorQueryParseSparql extends ActorQueryParse {
  public readonly prefixes: Record<string, string> | undefined;
  private readonly parser: any;
  private readonly parserDefaultContext: any;

  public constructor(args: IActorQueryParseSparqlArgs) {
    super(args);
    this.prefixes = Object.freeze(args.prefixes);
    this.parser = patchedParserBuilder.build({
      lexerConfig: { positionTracking: 'onlyOffset' },
      queryPreProcessor: sparqlCodepointEscape,
      tokenVocabulary: lex.sparql12LexerBuilder.tokenVocabulary,
    });
    this.parserDefaultContext = completeParseContext({});
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
    const parsedSyntax: SparqlQuery = this.parser.queryOrUpdate(action.query, copyParseContext({
      ...this.parserDefaultContext,
      prefixes: this.prefixes ?? this.parserDefaultContext.prefixes,
      baseIRI: action.baseIRI ?? this.parserDefaultContext.baseIRI,
      astFactory,
    }));
    parsedSyntax.loc = this.parserDefaultContext.astFactory.sourceLocationInlinedSource(
      action.query,
      parsedSyntax.loc,
      0,
      Number.MAX_SAFE_INTEGER,
    );
    let baseIRI: string | undefined;
    if (astFactory.isQuery(parsedSyntax)) {
      for (const context of parsedSyntax.context) {
        if (astFactory.isContextDefinitionBase(context)) {
          baseIRI = context.value.value;
        }
      }
    }

    const algebraOptions = {
      quads: true,
      prefixes: this.prefixes,
      blankToVariable: true,
      baseIRI: action.baseIRI,
      dataFactory,
    };
    const operation = toAlgebra(parsedSyntax, algebraOptions);

    // Post-process CONSTRUCT queries that used the quad template extension.
    // The grammar patch stores quad patterns in _quadsTemplate; we convert them here.
    if (astFactory.isQueryConstruct(parsedSyntax) && (<any>parsedSyntax)._quadsTemplate) {
      const algebraContext = createAlgebraContext(algebraOptions);
      algebraContext.variables = new Set();
      algebraContext.varCount = 0;
      algebraContext.useQuads = true;
      // Register prefixes declared in the query (PREFIX declarations are resolved in the AST)
      for (const def of (<any>parsedSyntax).context ?? []) {
        if (def.subType === 'prefix') {
          algebraContext.currentPrefixes[def.key] = def.value.value;
        } else if (def.subType === 'base') {
          algebraContext.currentBase = def.value.value;
        }
      }

      const quadPatterns: any[] = [];
      for (const item of (<any>parsedSyntax)._quadsTemplate) {
        const triples: any[] = (<any>algebraTransformer).translateUpdateTriplesBlock(algebraContext, item);
        quadPatterns.push(...triples);
      }

      replaceConstructTemplate(operation, quadPatterns);
    }

    return { baseIRI, operation };
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
