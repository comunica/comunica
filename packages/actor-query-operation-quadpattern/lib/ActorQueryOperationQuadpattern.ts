import {ActorQueryOperationTyped, Bindings, BindingsStream,
  IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {EmptyIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {RoundRobinUnionIterator} from "asynciterator-union";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {getTerms, mapTerms, QuadTermName, reduceTerms, uniqTerms} from "rdf-terms";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica actor for handling 'quadpattern' query operations.
 */
export class ActorQueryOperationQuadpattern extends ActorQueryOperationTyped<Algebra.Pattern>
  implements IActorQueryOperationQuadpatternArgs {

  public readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

  constructor(args: IActorQueryOperationQuadpatternArgs) {
    super(args, 'pattern');
  }

  /**
   * Check if a term is a variable or a blank node.
   * @param {RDF.Term} term An RDF term.
   * @return {any} If the term is a variable or blank node.
   */
  public static isTermVariableOrBlank(term: RDF.Term): any {
    return term.termType === 'Variable' || term.termType === 'BlankNode';
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the totalItems metadata value is properly calculated.
   * @param {(() => Promise<{[p: string]: any}>)[]} metadatas Array of metadata.
   * @return {() => Promise<{[p: string]: any}>} Union of the metadata.
   */
  public static unionMetadata(metadatas: (() => Promise<{[id: string]: any}>)[]): () => Promise<{[id: string]: any}> {
    return () => {
      return Promise.all(metadatas.map((m) => m ? m() : null))
        .then((metaObjects: {[id: string]: any}[]) => {
          let totalItems: number = 0;
          for (const metadata of metaObjects) {
            if (metadata && (metadata.totalItems || metadata.totalItems === 0) && isFinite(metadata.totalItems)) {
              totalItems += metadata.totalItems;
            } else {
              totalItems = Infinity;
              break;
            }
          }
          return { totalItems };
        });
    };
  }

  /**
   * @return {IActorQueryOperationOutputBindings} A new empty output result.
   */
  public static newEmptyResult(variables: string[]): IActorQueryOperationOutputBindings {
    return {
      bindingsStream: new EmptyIterator(),
      metadata: () => Promise.resolve({ totalItems: 0 }),
      type: 'bindings',
      variables,
    };
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string[]} The variables in this pattern, without '?' prefix.
   */
  public getVariables(pattern: RDF.Quad): string[] {
    return uniqTerms(getTerms(pattern)
      .filter(ActorQueryOperationQuadpattern.isTermVariableOrBlank))
      .map(termToString);
  }

  public async testOperation(operation: Algebra.Pattern, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Pattern, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutputBindings> {
    // Collect all variables from the pattern
    const variables: string[] = this.getVariables(pattern);

    let quadPattern: RDF.Quad = pattern;
    let bindGraph: RDF.Term = null;
    // Check if the available named graphs were specified
    if (context && context.namedGraphs && context.namedGraphs.length) {
      if (context.namedGraphs.length === 1) {
        const variableGraph: boolean = ActorQueryOperationQuadpattern.isTermVariableOrBlank(pattern.graph);
        if (variableGraph || pattern.graph.equals(context.namedGraphs[0])) {
          // Only a single named graph is being queried, and it matches the pattern's graph
          if (variableGraph) {
            quadPattern = mapTerms(quadPattern, (value, key) => key === 'graph' ? context.namedGraphs[0] : value);
            bindGraph = context.namedGraphs[0];
          }
        } else {
          // The single named graph does not match the pattern's graph, so the result is empty
          return ActorQueryOperationQuadpattern.newEmptyResult(variables);
        }
      } else {
        // Otherwise, take the union for all named graphs
        const outputs: IActorQueryOperationOutputBindings[] = await Promise.all<IActorQueryOperationOutputBindings>(
          context.namedGraphs.map((namedGraph: RDF.Term) => {
            const subContext: {[id: string]: any} = Object.assign({}, context, { namedGraphs: [ namedGraph ] });
            return this.runOperation(pattern, subContext);
          }));
        const subBindingsStream: BindingsStream = new RoundRobinUnionIterator(
          outputs.map((output) => output.bindingsStream), { autoStart: true, maxBufferSize: 128 });
        const subVariables: string[] = outputs[0].variables;
        const subMetadata: () => Promise<{[id: string]: any}> = ActorQueryOperationQuadpattern.unionMetadata(
          outputs.map((output) => output.metadata));
        return { type: 'bindings', bindingsStream: subBindingsStream, variables: subVariables, metadata: subMetadata };
      }
    }

    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern: quadPattern, context });

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: {[key: string]: string} = reduceTerms(pattern,
      (acc: {[key: string]: string}, term: RDF.Term, key: QuadTermName) => {
        if (ActorQueryOperationQuadpattern.isTermVariableOrBlank(term)) {
          acc[key] = termToString(term);
        }
        return acc;
      }, {});
    const quadBindingsReducer = (acc: {[key: string]: RDF.Term}, term: RDF.Term, key: QuadTermName) => {
      const variable: string = elementVariables[key];
      if (bindGraph && key === 'graph') {
        acc[variable] = bindGraph;
      } else if (variable) {
        acc[variable] = term;
      }
      return acc;
    };

    const bindingsStream: BindingsStream = new PromiseProxyIterator(async () => result.data.map((quad) => {
      return Bindings(reduceTerms(quad, quadBindingsReducer, {}));
    }, { autoStart: true, maxBufferSize: 128 }));

    return { type: 'bindings', bindingsStream, variables, metadata: result.metadata };
  }

}

export interface IActorQueryOperationQuadpatternArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
}
