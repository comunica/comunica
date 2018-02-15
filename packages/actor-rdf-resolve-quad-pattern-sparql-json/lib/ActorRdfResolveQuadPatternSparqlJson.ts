import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator, BufferedIterator} from "asynciterator";
import {blankNode, literal, namedNode, variable} from "rdf-data-model";
import * as RDF from "rdf-js";
import {getTerms, getVariables, mapTerms} from "rdf-terms";
import {Algebra, Factory, toSparql} from "sparqlalgebrajs";

/**
 * A comunica SPARQL JSON RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternSparqlJson
  extends ActorRdfResolveQuadPattern
  implements IActorRdfResolveQuadPatternSparqlJsonArgs {

  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorRdfResolveQuadPatternSparqlJsonArgs) {
    super(args);
  }

  /**
   * Convert a quad pattern to a BGP with only that pattern.
   * @param {RDF.pattern} quad A quad pattern.
   * @return {Bgp} A BGP.
   */
  public static patternToBgp(pattern: RDF.Quad): Algebra.Bgp {
    return ActorRdfResolveQuadPatternSparqlJson.FACTORY.createBgp([ ActorRdfResolveQuadPatternSparqlJson.FACTORY
      .createPattern(pattern.subject, pattern.predicate, pattern.object, pattern.graph) ]);
  }

  /**
   * Convert a quad pattern to a select query for this pattern.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string} A select query string.
   */
  public static patternToSelectQuery(pattern: RDF.Quad): string {
    const variables: RDF.Variable[] = getVariables(getTerms(pattern));
    return toSparql(ActorRdfResolveQuadPatternSparqlJson.FACTORY.createProject(
      ActorRdfResolveQuadPatternSparqlJson.patternToBgp(pattern),
      variables,
    ));
  }

  /**
   * Convert a quad pattern to a count query for the number of matching triples for this pattern.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string} A count query string.
   */
  public static patternToCountQuery(pattern: RDF.Quad): string {
    return toSparql(ActorRdfResolveQuadPatternSparqlJson.FACTORY.createProject(
      ActorRdfResolveQuadPatternSparqlJson.FACTORY.createExtend(
        ActorRdfResolveQuadPatternSparqlJson.FACTORY.createGroup(
          ActorRdfResolveQuadPatternSparqlJson.patternToBgp(pattern),
          [],
          [ActorRdfResolveQuadPatternSparqlJson.FACTORY.createBoundAggregate(
            variable('var0'),
            'count',
            ActorRdfResolveQuadPatternSparqlJson.FACTORY.createTermExpression(namedNode('*')),
            false,
          )],
        ),
        variable('count'),
        ActorRdfResolveQuadPatternSparqlJson.FACTORY.createTermExpression(variable('var0')),
      ),
      [ variable('count') ],
    ));
  }

  /**
   * Convert a SPARQL JSON result binding to a bindings object.
   * @param rawBindings A SPARQL json result binding.
   * @return {Bindings} A bindings object.
   */
  public static parseJsonBindings(rawBindings: any): Bindings {
    const bindings: {[key: string]: RDF.Term} = {};
    for (const key in rawBindings) {
      const rawValue: any = rawBindings[key];
      let value: RDF.Term = null;
      switch (rawValue.type) {
      case 'bnode':
        value = blankNode(rawValue.value);
        break;
      case 'literal':
        if (rawValue['xml:lang']) {
          value = literal(rawValue.value, rawValue['xml:lang']);
        } else if (rawValue.datatype) {
          value = literal(rawValue.value, namedNode(rawValue.datatype));
        } else {
          value = literal(rawValue.value);
        }
        break;
      default:
        value = namedNode(rawValue.value);
        break;
      }
      bindings['?' + key] = value;
    }
    return Bindings(bindings);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
      || action.context.sources[0].type !== 'sparql' || !action.context.sources[0].value) {
      throw new Error(this.name + ' requires a single source with a \'sparql\' endpoint to be present in the context.');
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const endpoint: string = action.context.sources[0].value;
    const selectQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(action.pattern);
    const countQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(action.pattern);

    // Create promise for the metadata containing the estimated count
    const metadata: Promise<{[id: string]: any}> = this.queryBindings(endpoint, countQuery)
      .then((bindingsStream: BindingsStream) => {
        return new Promise((resolve, reject) => {
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
      });

    // Materialize the queried pattern using each found binding.
    const data: AsyncIterator<RDF.Quad> & RDF.Stream = (await this.queryBindings(endpoint, selectQuery))
      .map((bindings: Bindings) => mapTerms(action.pattern, (value: RDF.Term) => {
        if (value.termType === 'Variable') {
          const boundValue: RDF.Term = bindings.get('?' + value.value);
          if (!boundValue) {
            data.emit('error',
              new Error('The endpoint ' + endpoint + ' failed to provide a binding for ' + value.value));
          }
          return boundValue;
        }
        return value;
      }));

    return { data, metadata };
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @return {Promise<BindingsStream>} A promise resolving to a stream of bindings.
   */
  protected async queryBindings(endpoint: string, query: string): Promise<BindingsStream> {
    const url: string = endpoint + '?query=' + encodeURIComponent(query);

    // Initiate request
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { input: url, init: { headers } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = require('is-stream')(httpResponse.body)
      ? httpResponse.body : require('node-web-streams').toNodeReadable(httpResponse.body);

    // Get streamed bindings
    const rawBindingsStream: NodeJS.ReadableStream = responseStream
      .pipe(require('JSONStream').parse('results.bindings.*'));
    responseStream.on('error', (error) => rawBindingsStream.emit('error', error));

    // Parse each binding and push it in our buffered iterator
    const bindingsStream: BufferedIterator<Bindings> = new BufferedIterator<Bindings>();
    rawBindingsStream.on('error', (error) => bindingsStream.emit('error', error));
    rawBindingsStream.on('data', (rawBindings) => {
      bindingsStream._push(ActorRdfResolveQuadPatternSparqlJson.parseJsonBindings(rawBindings));
    });
    rawBindingsStream.on('end', () => {
      bindingsStream.close();
    });

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok) {
      setImmediate(() => bindingsStream.emit('error', new Error('Invalid SPARQL endpoint (' + endpoint + ') response: '
        + httpResponse.statusText)));
    }

    return bindingsStream;
  }

}

export interface IActorRdfResolveQuadPatternSparqlJsonArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
