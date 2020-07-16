import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {
  ActorRdfResolveQuadPattern,
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {variable} from "@rdfjs/data-model";
import {AsyncIterator, TransformIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {getTerms, getVariables, mapTerms} from "rdf-terms";
import {Algebra, Factory, toSparql} from "sparqlalgebrajs";
import {AsyncIteratorJsonBindings} from "./AsyncIteratorJsonBindings";

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
    return ActorRdfResolveQuadPatternSparqlJson.FACTORY.createBgp([ ActorRdfResolveQuadPatternSparqlJson.FACTORY
      .createPattern(pattern.subject, pattern.predicate, pattern.object, pattern.graph) ]);
  }

  /**
   * Convert a quad pattern to a select query for this pattern.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string} A select query string.
   */
  public static patternToSelectQuery(pattern: RDF.BaseQuad): string {
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
  public static patternToCountQuery(pattern: RDF.BaseQuad): string {
    return toSparql(ActorRdfResolveQuadPatternSparqlJson.FACTORY.createProject(
      ActorRdfResolveQuadPatternSparqlJson.FACTORY.createExtend(
        ActorRdfResolveQuadPatternSparqlJson.FACTORY.createGroup(
          ActorRdfResolveQuadPatternSparqlJson.patternToBgp(pattern),
          [],
          [ActorRdfResolveQuadPatternSparqlJson.FACTORY.createBoundAggregate(
            variable('var0'),
            'count',
            ActorRdfResolveQuadPatternSparqlJson.FACTORY.createWildcardExpression(),
            false,
          )],
        ),
        variable('count'),
        ActorRdfResolveQuadPatternSparqlJson.FACTORY.createTermExpression(variable('var0')),
      ),
      [ variable('count') ],
    ));
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSourceOfType('sparql', action.context)) {
      throw new Error(this.name + ' requires a single source with a \'sparql\' endpoint to be present in the context.');
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const endpoint: string = <string> this.getContextSourceUrl(this.getContextSource(action.context));
    const pattern = ActorRdfResolveQuadPatternSparqlJson.replaceBlankNodes(action.pattern);
    const selectQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToSelectQuery(pattern);
    const countQuery: string = ActorRdfResolveQuadPatternSparqlJson.patternToCountQuery(pattern);

    // Create promise for the metadata containing the estimated count
    const metadata: () => Promise<{[id: string]: any}> = () => this.queryBindings(endpoint, countQuery, action.context)
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
    const data: AsyncIterator<RDF.Quad> & RDF.Stream = new TransformIterator(async () =>
      (await this.queryBindings(endpoint, selectQuery, action.context))
        .map((bindings: Bindings) => <RDF.Quad> mapTerms(pattern, (value: RDF.Term) => {
          if (value.termType === 'Variable') {
            const boundValue: RDF.Term = bindings.get('?' + value.value);
            if (!boundValue) {
              data.emit('error',
                new Error('The endpoint ' + endpoint + ' failed to provide a binding for ' + value.value));
            }
            return boundValue;
          }
          return value;
        })), { autoStart: false });

    return { data, metadata };
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @param {ActionContext} context An optional context.
   * @return {Promise<BindingsStream>} A promise resolving to a stream of bindings.
   */
  public async queryBindings(endpoint: string, query: string, context?: ActionContext): Promise<BindingsStream> {
    return new AsyncIteratorJsonBindings(endpoint, query, context, this.mediatorHttp);
  }

}

export interface IActorRdfResolveQuadPatternSparqlJsonArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
