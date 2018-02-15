import {ActorQueryOperationTyped, Bindings, BindingsStream,
  IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {getTerms, QuadTermName, reduceTerms, uniqTerms} from "rdf-terms";
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
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string[]} The variables in this pattern, without '?' prefix.
   */
  public getVariables(pattern: RDF.Quad): string[] {
    return uniqTerms(getTerms(pattern)
      .filter((term) => term.termType === 'Variable' || term.termType === 'BlankNode'))
      .map(termToString);
  }

  public async testOperation(operation: Algebra.Pattern, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Pattern, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutputBindings> {
    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern, context });

    // Collect all variables from the pattern
    const variables: string[] = this.getVariables(pattern);

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: {[key: string]: string} = reduceTerms(pattern,
      (acc: {[key: string]: string}, term: RDF.Term, key: QuadTermName) => {
        if (term.termType === 'Variable' || term.termType === 'BlankNode') {
          acc[key] = termToString(term);
        }
        return acc;
      }, {});

    const bindingsStream: BindingsStream = result.data.map((quad) => {
      return Bindings(reduceTerms(quad,
        (acc: {[key: string]: RDF.Term}, term: RDF.Term, key: QuadTermName) => {
          const variable: string = elementVariables[key];
          if (variable) {
            acc[variable] = term;
          }
          return acc;
        }, {}));
    });

    return { type: 'bindings', bindingsStream, variables, metadata: result.metadata };
  }

}

export interface IActorQueryOperationQuadpatternArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
}
