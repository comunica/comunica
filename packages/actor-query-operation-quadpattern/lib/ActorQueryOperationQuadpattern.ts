import {ActorQueryOperationTyped, Bindings, BindingsStream,
  IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {getTerms, QUAD_TERM_NAMES, QuadTermName, reduceTerms, TRIPLE_TERM_NAMES, uniqTerms} from "rdf-terms";
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
   * Check if a term is a variable.
   * @param {RDF.Term} term An RDF term.
   * @return {any} If the term is a variable or blank node.
   */
  public static isTermVariable(term: RDF.Term): any {
    return term.termType === 'Variable';
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   * @return {string[]} The variables in this pattern, without '?' prefix.
   */
  public static getVariables(pattern: RDF.BaseQuad): string[] {
    return uniqTerms(getTerms(pattern)
      .filter(ActorQueryOperationQuadpattern.isTermVariable))
      .map(termToString);
  }

  /**
   * A helper function to find a hash with quad elements that have duplicate variables.
   *
   * @param {RDF.Quad} pattern A quad pattern.
   *
   * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns null.
   *                                   Otherwise, this maps quad elements ('subject', 'predicate', 'object', 'graph')
   *                                   to the list of quad elements it shares a variable name with.
   *                                   If no links for a certain element exist, this element will
   *                                   not be included in the hash.
   *                                   Note 1: Quad elements will never have a link to themselves.
   *                                           So this can never occur: { subject: [ 'subject'] },
   *                                           instead 'null' would be returned.
   *                                   Note 2: Links only exist in one direction,
   *                                           this means that { subject: [ 'predicate'], predicate: [ 'subject' ] }
   *                                           will not occur, instead only { subject: [ 'predicate'] }
   *                                           will be returned.
   */
  public static getDuplicateElementLinks(pattern: RDF.BaseQuad): {[element: string]: string[]} {
    // Collect a variable to quad elements mapping.
    const variableElements: {[variableName: string]: string[]} = {};
    let duplicateVariables = false;
    for (const key of QUAD_TERM_NAMES) {
      if (pattern[key].termType === 'Variable') {
        const val = termToString(pattern[key]);
        const length = (variableElements[val] || (variableElements[val] = [])).push(key);
        duplicateVariables = duplicateVariables || length > 1;
      }
    }

    if (!duplicateVariables) {
      return null;
    }

    // Collect quad element to elements with equal variables mapping.
    const duplicateElementLinks: {[element: string]: string[]} = {};
    for (const variable in variableElements) {
      const elements = variableElements[variable];
      const remainingElements = elements.slice(1);
      // Only store the elements that have at least one equal element.
      if (remainingElements.length) {
        duplicateElementLinks[elements[0]] = remainingElements;
      }
    }

    return duplicateElementLinks;
  }

  public async testOperation(operation: Algebra.Pattern, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Pattern, context: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {
    // Apply the (optional) pattern-specific context
    if (pattern.context) {
      context = context ? context.merge(pattern.context) : pattern.context;
    }

    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern, context });

    // Collect all variables from the pattern
    const variables: string[] = ActorQueryOperationQuadpattern.getVariables(pattern);

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: {[key: string]: string} = reduceTerms(pattern,
      (acc: {[key: string]: string}, term: RDF.Term, key: QuadTermName) => {
        if (ActorQueryOperationQuadpattern.isTermVariable(term)) {
          acc[key] = termToString(term);
        }
        return acc;
      }, {});
    const quadBindingsReducer = (acc: {[key: string]: RDF.Term}, term: RDF.Term, key: QuadTermName) => {
      const variable: string = elementVariables[key];
      if (variable) {
        acc[variable] = term;
      }
      return acc;
    };

    // Optionally filter, and construct bindings
    const bindingsStream: BindingsStream = new PromiseProxyIterator(async () => {
      let filteredOutput = result.data;

      // Detect duplicate variables in the pattern
      const duplicateElementLinks: { [element: string]: string[] } = ActorQueryOperationQuadpattern
        .getDuplicateElementLinks(pattern);

      // If there are duplicate variables in the search pattern,
      // make sure that we filter out the triples that don't have equal values for those triple elements,
      // as QPF ignores variable names.
      if (duplicateElementLinks) {
        filteredOutput = filteredOutput.filter((quad) => {
          // No need to check the graph, because an equal element already would have to be found in s, p, or o.
          for (const element1 of TRIPLE_TERM_NAMES) {
            for (const element2 of (duplicateElementLinks[element1] || [])) {
              if (!(<any> quad)[element1].equals((<any> quad)[element2])) {
                return false;
              }
            }
          }
          return true;
        });
      }

      return filteredOutput.map((quad) => {
        return Bindings(reduceTerms(quad, quadBindingsReducer, {}));
      }, { autoStart: true, maxBufferSize: 128 });
    });

    return { type: 'bindings', bindingsStream, variables, metadata: result.metadata };
  }

}

export interface IActorQueryOperationQuadpatternArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
}
