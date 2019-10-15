import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {AsyncIterator, BufferedIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {getTerms, getVariables, mapTerms} from "rdf-terms";
import {Algebra, Factory, toSparql} from "sparqlalgebrajs";
import {SparqlJsonParser} from "sparqljson-parse";

export class RdfSourceSparql implements RDF.Source {

  protected static readonly FACTORY: Factory = new Factory();

  private readonly url: string;
  private readonly context: ActionContext;
  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(url: string, context: ActionContext,
              mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
                IActionHttp, IActorTest, IActorHttpOutput>) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  /**
   * Replace all blank nodes in a pattern with variables.
   * If the pattern contains no blank nodes the original pattern gets returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   * @return {RDF.BaseQuad} A quad pattern with no blank nodes.
   */
  public static replaceBlankNodes(pattern: RDF.BaseQuad): RDF.BaseQuad {
    const variableNames: string[] = getVariables(getTerms(pattern)).map((v) => v.value);
    // track the names the blank nodes get mapped to (required if the name has to change)
    const blankMap: { [id: string]: string } = {};
    let changed = false;

    // for every position, convert to a variable if there is a blank node
    const result = mapTerms(pattern, (term) => {
      if (term.termType === 'BlankNode') {
        let name = term.value;
        if (blankMap[name]) {
          name = blankMap[name];
        } else {
          if (variableNames.indexOf(name) >= 0) {
            // increase index added to name until we find one that is available (2 loops at most)
            let idx = 0;
            while (variableNames.indexOf(name + idx) >= 0) {
              ++idx;
            }
            name = name + idx;
          }
          blankMap[term.value] = name;
          variableNames.push(name);
        }
        changed = true;
        return variable(name);
      } else {
        return term;
      }
    });

    return changed ? result : pattern;
  }

  /**
   * Convert a quad pattern to a BGP with only that pattern.
   * @param {RDF.pattern} quad A quad pattern.
   * @return {Bgp} A BGP.
   */
  public static patternToBgp(pattern: RDF.BaseQuad): Algebra.Bgp {
    return RdfSourceSparql.FACTORY.createBgp([ RdfSourceSparql.FACTORY
      .createPattern(pattern.subject, pattern.predicate, pattern.object, pattern.graph) ]);
  }

  /**
   * Convert a quad pattern to a select query for this pattern.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string} A select query string.
   */
  public static patternToSelectQuery(pattern: RDF.BaseQuad): string {
    const variables: RDF.Variable[] = getVariables(getTerms(pattern));
    return toSparql(RdfSourceSparql.FACTORY.createProject(
      RdfSourceSparql.patternToBgp(pattern),
      variables,
    ));
  }

  /**
   * Convert a quad pattern to a count query for the number of matching triples for this pattern.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string} A count query string.
   */
  public static patternToCountQuery(pattern: RDF.BaseQuad): string {
    return toSparql(RdfSourceSparql.FACTORY.createProject(
      RdfSourceSparql.FACTORY.createExtend(
        RdfSourceSparql.FACTORY.createGroup(
          RdfSourceSparql.patternToBgp(pattern),
          [],
          [RdfSourceSparql.FACTORY.createBoundAggregate(
            variable('var0'),
            'count',
            RdfSourceSparql.FACTORY.createWildcardExpression(),
            false,
          )],
        ),
        variable('count'),
        RdfSourceSparql.FACTORY.createTermExpression(variable('var0')),
      ),
      [ variable('count') ],
    ));
  }

  /**
   * Return a new variable if the term is undefined, or the term as-is.
   * @param {Term | null} term A term or null.
   * @param {string} variableName A variable name to assign when the term was null.
   * @return {Term} A term.
   */
  public static materializeOptionalTerm(term: RDF.Term | null, variableName: string): RDF.Term {
    return term || variable(variableName);
  }

  public async fetchBindingsStream(endpoint: string, query: string, context: ActionContext)
    : Promise<NodeJS.ReadableStream> {
    const url: string = endpoint + '?query=' + encodeURIComponent(query);

    // Initiate request
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { context, input: url, init: { headers } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = ActorHttp.toNodeReadable(httpResponse.body);

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok) {
      setImmediate(() => responseStream.emit('error', new Error(
        `Invalid SPARQL endpoint (${endpoint}) response: ${httpResponse.statusText} (${httpResponse.status})`)));
    }

    return responseStream;
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @param {ActionContext} context An optional context.
   * @return {Promise<BindingsStream>} A promise resolving to a stream of bindings.
   */
  public async queryBindings(endpoint: string, query: string, context: ActionContext): Promise<BindingsStream> {
    // Parse each binding and push it in our buffered iterator
    const bindingsStream: BufferedIterator<Bindings> = new BufferedIterator<Bindings>(
      { autoStart: false, maxBufferSize: Infinity });
    let initialized: boolean = false;
    const superRead = bindingsStream._read;
    bindingsStream._read = (count: number, done: () => void) => {
      if (!initialized) {
        initialized = true;
        this.fetchBindingsStream(endpoint, query, context).then((responseStream) => {
          const rawBindingsStream = new SparqlJsonParser({ prefixVariableQuestionMark: true })
            .parseJsonResultsStream(responseStream);
          responseStream.on('error', (error) => rawBindingsStream.emit('error', error));

          rawBindingsStream.on('error', (error) => bindingsStream.emit('error', error));
          rawBindingsStream.on('data', (rawBindings) => bindingsStream._push(Bindings(rawBindings)));
          rawBindingsStream.on('end', () => {
            bindingsStream.close();
          });

          superRead(count, done);
        });
      } else {
        superRead(count, done);
      }
    };

    return bindingsStream;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    if (subject instanceof RegExp
      || predicate instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("RdfSourceSparql does not support matching by regular expressions.");
    }

    const pattern = RdfSourceSparql.replaceBlankNodes(RdfSourceSparql.FACTORY.createPattern(
      RdfSourceSparql.materializeOptionalTerm(subject, 's'),
      RdfSourceSparql.materializeOptionalTerm(predicate, 'p'),
      RdfSourceSparql.materializeOptionalTerm(object, 'o'),
      RdfSourceSparql.materializeOptionalTerm(graph, 'g'),
    ));
    const countQuery: string = RdfSourceSparql.patternToCountQuery(pattern);
    const selectQuery: string = RdfSourceSparql.patternToSelectQuery(pattern);

    // Emit metadata containing the estimated count
    this.queryBindings(this.url, countQuery, this.context)
      .then((bindingsStream: BindingsStream) => {
        return new Promise((resolve) => {
          bindingsStream.on('data', (bindings: Bindings) => {
            const count: RDF.Term = bindings.get('?count');
            if (count) {
              const totalItems: number = parseInt(count.value, 10);
              if (isNaN(totalItems)) {
                return resolve({ totalItems: Infinity });
              }
              return resolve({ totalItems });
            } else {
              return resolve({ totalItems: Infinity });
            }
          });
          bindingsStream.on('error', () => {
            return resolve({ totalItems: Infinity });
          });
          bindingsStream.on('end', () => {
            return resolve({ totalItems: Infinity });
          });
        });
      })
      .then((metadata) => quads.emit('metadata', metadata));

    // Materialize the queried pattern using each found binding.
    const quads: AsyncIterator<RDF.Quad> & RDF.Stream = new PromiseProxyIterator(async () =>
      (await this.queryBindings(this.url, selectQuery, this.context))
        .map((bindings: Bindings) => <RDF.Quad> mapTerms(pattern, (value: RDF.Term) => {
          if (value.termType === 'Variable') {
            const boundValue: RDF.Term = bindings.get('?' + value.value);
            if (!boundValue) {
              quads.emit('error',
                new Error(`The endpoint ${this.url} failed to provide a binding for ${value.value}.`));
            }
            return boundValue;
          }
          return value;
        })));

    return quads;
  }

}
