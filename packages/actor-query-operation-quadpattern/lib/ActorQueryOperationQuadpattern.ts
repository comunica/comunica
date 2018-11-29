import {ActorQueryOperationTyped, Bindings, BindingsStream,
  IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
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
   * Check if a term is a variable or a blank node.
   * @param {RDF.Term} term An RDF term.
   * @return {any} If the term is a variable or blank node.
   */
  public static isTermVariableOrBlank(term: RDF.Term): any {
    return term.termType === 'Variable' || term.termType === 'BlankNode';
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.BaseQuad} pattern A quad pattern.
   * @return {string[]} The variables in this pattern, without '?' prefix.
   */
  public getVariables(pattern: RDF.BaseQuad): string[] {
    return uniqTerms(getTerms(pattern)
      .filter(ActorQueryOperationQuadpattern.isTermVariableOrBlank))
      .map(termToString);
  }

  public async testOperation(operation: Algebra.Pattern, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Pattern, context: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {
    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern, context });

    // Collect all variables from the pattern
    const variables: string[] = this.getVariables(pattern);

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
      if (variable) {
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
