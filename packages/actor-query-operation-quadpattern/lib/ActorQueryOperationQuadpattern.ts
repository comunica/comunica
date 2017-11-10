import {ActorQueryOperationTyped, Bindings, BindingsStream, IActionQueryOperation,
  IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {BufferedIterator} from "asynciterator";
import * as _ from "lodash";
import * as RDF from "rdf-js";
import {Pattern} from "sparqlalgebrajs";

/**
 * A comunica actor for handling 'quadpattern' query operations.
 */
export class ActorQueryOperationQuadpattern extends ActorQueryOperationTyped<Pattern>
  implements IActorQueryOperationQuadpatternArgs {

  public static readonly QUAD_ELEMENTS = [ 'subject', 'predicate', 'object', 'graph' ];

  public readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

  constructor(args: IActorQueryOperationQuadpatternArgs) {
    super(_.assign(args, { operationName: 'pattern' }));
    if (!this.mediatorResolveQuadPattern) {
      throw new Error('A valid "mediatorResolveQuadPattern" argument must be provided.');
    }
  }

  /**
   * Get all variables in the given pattern.
   * No duplicates are returned.
   * @param {RDF.Quad} pattern A quad pattern.
   * @return {string[]} The variables in this pattern, without '?' prefix.
   */
  public getVariables(pattern: RDF.Quad): string[] {
    return _.uniq(ActorQueryOperationQuadpattern.QUAD_ELEMENTS
      .map((element) => (<any> pattern)[element])
      .filter((term) => term.termType === 'Variable')
      .map((term) => term.value));
  }

  public async runOperation(pattern: Pattern, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutput> {
    // Resolve the quad pattern
    const result = await this.mediatorResolveQuadPattern.mediate({ pattern, context });

    // Collect all variables from the pattern
    const variables: string[] = this.getVariables(pattern);

    // Convenience datastructure for mapping quad elements to variables
    const elementVariables: {[element: string]: string} = ActorQueryOperationQuadpattern.QUAD_ELEMENTS
      .reduce((acc: {[element: string]: string}, element: string) => {
        const term: RDF.Term = (<any> pattern)[element];
        if (term.termType === 'Variable') {
          acc[element] = term.value;
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

    return { bindingsStream, variables, metadata: result.metadata };
  }
/*
  // TODO: remove this once SPARQL Algebra emits RDFJS-compatible terms.
  protected getTerm(term: string): RDF.Term {
    if (term.charAt(0) === '?') {
      return <RDF.Term> { termType: 'Variable', value: term.substr(1) };
    } else {
      return <RDF.Term> { termType: 'NamedNode', value: term };
    }
  }

  // TODO: remove this once SPARQL Algebra emits RDFJS-compatible terms.
  protected getQuad(pattern: Pattern): RDF.Quad {
    return <RDF.Quad> {
      graph: this.getTerm(pattern.graph),
      object: this.getTerm(pattern.object),
      predicate: this.getTerm(pattern.predicate),
      subject: this.getTerm(pattern.subject),
    };
  }*/

}

export interface IActorQueryOperationQuadpatternArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
}
