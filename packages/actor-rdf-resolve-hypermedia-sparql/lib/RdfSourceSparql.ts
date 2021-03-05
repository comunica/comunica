import {
  ActorRdfResolveQuadPatternSparqlJson,
  AsyncIteratorJsonBindings,
} from '@comunica/actor-rdf-resolve-quad-pattern-sparql-json';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import type { Bindings, BindingsStream } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { mapTerms } from 'rdf-terms';
import { Factory } from 'sparqlalgebrajs';

export class RdfSourceSparql implements IQuadSource {
  protected static readonly FACTORY: Factory = new Factory();

  private readonly url: string;
  private readonly context: ActionContext | undefined;
  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(url: string, context: ActionContext | undefined,
    mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
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

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    const pattern = ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(RdfSourceSparql.FACTORY.createPattern(
      subject,
      predicate,
      object,
      graph,
    ));
    const countQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(pattern);
    const selectQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(pattern);

    // Emit metadata containing the estimated count (reject is never called)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    new Promise(resolve => {
      const bindingsStream: BindingsStream = this.queryBindings(this.url, countQuery, this.context);
      bindingsStream.on('data', (bindings: Bindings) => {
        const count: RDF.Term = bindings.get('?count');
        if (count) {
          const totalItems: number = Number.parseInt(count.value, 10);
          if (Number.isNaN(totalItems)) {
            return resolve({ totalItems: Number.POSITIVE_INFINITY });
          }
          return resolve({ totalItems });
        }
        return resolve({ totalItems: Number.POSITIVE_INFINITY });
      });
      bindingsStream.on('error', () => resolve({ totalItems: Number.POSITIVE_INFINITY }));
      bindingsStream.on('end', () => resolve({ totalItems: Number.POSITIVE_INFINITY }));
    })
      .then(metadata => quads.setProperty('metadata', metadata));

    // Materialize the queried pattern using each found binding.
    const quads: AsyncIterator<RDF.Quad> & RDF.Stream = this.queryBindings(this.url, selectQuery, this.context)
      .map((bindings: Bindings) => <RDF.Quad> mapTerms(pattern, (value: RDF.Term) => {
        if (value.termType === 'Variable') {
          const boundValue: RDF.Term = bindings.get(`?${value.value}`);
          if (!boundValue) {
            quads.destroy(new Error(`The endpoint ${this.url} failed to provide a binding for ${value.value}.`));
          }
          return boundValue;
        }
        return value;
      }));

    return quads;
  }
}
