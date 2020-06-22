import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {variable} from "@rdfjs/data-model";
import {AsyncIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {mapTerms} from "rdf-terms";
import {Factory} from "sparqlalgebrajs";
import {
  ActorRdfResolveQuadPatternSparqlJson,
  AsyncIteratorJsonBindings
} from "@comunica/actor-rdf-resolve-quad-pattern-sparql-json";

export class RdfSourceSparql implements RDF.Source {

  protected static readonly FACTORY: Factory = new Factory();

  private readonly url: string;
  private readonly context: ActionContext | undefined;
  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(url: string, context: ActionContext | undefined,
              mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
                IActionHttp, IActorTest, IActorHttpOutput>) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  /**
   * Return a new variable if the term is undefined, or the term as-is.
   * @param {Term | undefined} term A term or undefined.
   * @param {string} variableName A variable name to assign when the term was null.
   * @return {Term} A term.
   */
  public static materializeOptionalTerm(term: RDF.Term | undefined, variableName: string): RDF.Term {
    return term || variable(variableName);
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @param {ActionContext} context An optional context.
   * @return {BindingsStream} A stream of bindings.
   */
  public queryBindings(endpoint: string, query: string, context?: ActionContext): BindingsStream {
    return new AsyncIteratorJsonBindings(endpoint, query, context, this.mediatorHttp);
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

    const pattern = ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(RdfSourceSparql.FACTORY.createPattern(
      RdfSourceSparql.materializeOptionalTerm(subject, 's'),
      RdfSourceSparql.materializeOptionalTerm(predicate, 'p'),
      RdfSourceSparql.materializeOptionalTerm(object, 'o'),
      RdfSourceSparql.materializeOptionalTerm(graph, 'g'),
    ));
    const countQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(pattern);
    const selectQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(pattern);

    // Emit metadata containing the estimated count
    new Promise((resolve) => {
      const bindingsStream: BindingsStream = this.queryBindings(this.url, countQuery, this.context);
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
    }).then((metadata) => quads.emit('metadata', metadata));

    // Materialize the queried pattern using each found binding.
    const quads: AsyncIterator<RDF.Quad> & RDF.Stream = this.queryBindings(this.url, selectQuery, this.context)
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
      }))

    return quads;
  }

}
