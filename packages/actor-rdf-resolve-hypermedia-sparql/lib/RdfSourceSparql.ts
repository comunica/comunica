import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorHttp } from '@comunica/bus-http';
import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { Bindings, BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator, wrap } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { getTerms, getVariables, mapTermsNested } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, toSparql } from 'sparqlalgebrajs';

const DF = new DataFactory();
const BF = new BindingsFactory();
const VAR_COUNT = DF.variable('count');

export class RdfSourceSparql implements IQuadSource {
  protected static readonly FACTORY: Factory = new Factory();

  private readonly url: string;
  private readonly context: IActionContext;
  private readonly mediatorHttp: MediatorHttp;

  private readonly endpointFetcher: SparqlEndpointFetcher;
  private readonly cache: LRUCache<string, RDF.QueryResultCardinality> | undefined;

  public constructor(url: string, context: IActionContext, mediatorHttp: MediatorHttp, forceHttpGet: boolean,
    cacheSize: number) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
    this.endpointFetcher = new SparqlEndpointFetcher({
      method: forceHttpGet ? 'GET' : 'POST',
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.context },
      ),
      prefixVariableQuestionMark: true,
    });
    this.cache = cacheSize > 0 ?
      new LRUCache<string, RDF.QueryResultCardinality>({ max: cacheSize }) :
      undefined;
  }

  /**
   * Replace all blank nodes in a pattern with variables.
   * If the pattern contains no blank nodes the original pattern gets returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   * @return {RDF.BaseQuad} A quad pattern with no blank nodes.
   */
  public static replaceBlankNodes(pattern: RDF.BaseQuad): RDF.BaseQuad {
    const variableNames: string[] = getVariables(getTerms(pattern)).map(variableTerm => variableTerm.value);
    // Track the names the blank nodes get mapped to (required if the name has to change)
    const blankMap: Record<string, string> = {};
    let changed = false;

    // For every position, convert to a variable if there is a blank node
    const result = mapTermsNested(pattern, term => {
      if (term.termType === 'BlankNode') {
        let name = term.value;
        if (blankMap[name]) {
          name = blankMap[name];
        } else {
          if (variableNames.includes(name)) {
            // Increase index added to name until we find one that is available (2 loops at most)
            let idx = 0;
            while (variableNames.includes(`${name}${idx}`)) {
              ++idx;
            }
            name += idx;
          }
          blankMap[term.value] = name;
          variableNames.push(name);
        }
        changed = true;
        return DF.variable(name);
      }
      return term;
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
    ), { sparqlStar: true });
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
          [ RdfSourceSparql.FACTORY.createBoundAggregate(
            DF.variable('var0'),
            'count',
            RdfSourceSparql.FACTORY.createWildcardExpression(),
            false,
          ) ],
        ),
        DF.variable('count'),
        RdfSourceSparql.FACTORY.createTermExpression(DF.variable('var0')),
      ),
      [ DF.variable('count') ],
    ), { sparqlStar: true });
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @return {BindingsStream} A stream of bindings.
   */
  public async queryBindings(endpoint: string, query: string): Promise<BindingsStream> {
    const rawStream = await this.endpointFetcher.fetchBindings(endpoint, query);
    return wrap<any>(rawStream, { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY })
      .map((rawData: Record<string, RDF.Term>) => BF.bindings(Object.entries(rawData)
        .map(([ key, value ]) => [ DF.variable(key.slice(1)), value ])));
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    const pattern = RdfSourceSparql.replaceBlankNodes(RdfSourceSparql.FACTORY.createPattern(
      subject,
      predicate,
      object,
      graph,
    ));
    const countQuery: string = RdfSourceSparql.patternToCountQuery(pattern);
    const selectQuery: string = RdfSourceSparql.patternToSelectQuery(pattern);

    // Emit metadata containing the estimated count (reject is never called)
    new Promise<RDF.QueryResultCardinality>(async(resolve, reject) => {
      try {
        const cachedCardinality = this.cache?.get(countQuery);
        if (cachedCardinality !== undefined) {
          return resolve(cachedCardinality);
        }

        const bindingsStream: BindingsStream = await this.queryBindings(this.url, countQuery);
        bindingsStream.on('data', (bindings: Bindings) => {
          const count = bindings.get(VAR_COUNT);
          const cardinality: RDF.QueryResultCardinality = { type: 'estimate', value: Number.POSITIVE_INFINITY };
          if (count) {
            const cardinalityValue: number = Number.parseInt(count.value, 10);
            if (!Number.isNaN(cardinalityValue)) {
              cardinality.type = 'exact';
              cardinality.value = cardinalityValue;
              this.cache?.set(countQuery, cardinality);
            }
          }
          return resolve(cardinality);
        });
        bindingsStream.on('error', () => resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY }));
        bindingsStream.on('end', () => resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY }));
      } catch (error: unknown) {
        reject(error);
      }
    })
      .then(cardinality => quads.setProperty('metadata', { cardinality, canContainUndefs: false }))
      .catch(() => quads.setProperty(
        'metadata',
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      ));

    // Materialize the queried pattern using each found binding.
    const quads: AsyncIterator<RDF.Quad> & RDF.Stream = new TransformIterator(async() => this
      .queryBindings(this.url, selectQuery), { autoStart: false })
      .transform({
        map: (bindings: Bindings) => <RDF.Quad> mapTermsNested(pattern, (value: RDF.Term) => {
          if (value.termType === 'Variable') {
            const boundValue = bindings.get(value);
            if (!boundValue) {
              quads.destroy(new Error(`The endpoint ${this.url} failed to provide a binding for ${value.value}.`));
            }
            return boundValue!;
          }
          return value;
        }),
        autoStart: false,
      });

    return quads;
  }
}
