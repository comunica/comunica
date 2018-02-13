import {ActorQueryOperationTyped, Bindings, BindingsStream,
  IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica actor for handling 'quadpattern' query operations.
 */
export class ActorQueryOperationQuadpattern extends ActorQueryOperationTyped<Algebra.Pattern>
  implements IActorQueryOperationQuadpatternArgs {

  public static readonly QUAD_ELEMENTS = [ 'subject', 'predicate', 'object', 'graph' ];

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
    return require('lodash.uniq')(ActorQueryOperationQuadpattern.QUAD_ELEMENTS
      .map((element) => (<any> pattern)[element])
      .filter((term) => term.termType === 'Variable' || term.termType === 'BlankNode')
      .map(termToString));
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
    const elementVariables: {[element: string]: string} = ActorQueryOperationQuadpattern.QUAD_ELEMENTS
      .reduce((acc: {[element: string]: string}, element: string) => {
        const term: RDF.Term = (<any> pattern)[element];
        if (term.termType === 'Variable' || term.termType === 'BlankNode') {
          acc[element] = termToString(term);
        }
        return acc;
      }, {});

    const bindingsStream: BindingsStream = result.data.map((quad) => {
      return Bindings(ActorQueryOperationQuadpattern.QUAD_ELEMENTS
        .reduce((acc: {[element: string]: string}, element) => {
          const variable: string = elementVariables[element];
          if (variable) {
            acc[variable] = (<any> quad)[element];
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
