import type { IActionSparqlParse, IActorSparqlParseOutput } from '@comunica/bus-sparql-parse';
import { ActorSparqlParse } from '@comunica/bus-sparql-parse';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { translate } from 'sparqlalgebrajs';
import { Parser as SparqlParser } from 'sparqljs';

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorSparqlParseAlgebra extends ActorSparqlParse {
  public readonly prefixes: Record<string, string>;

  public constructor(args: IActorSparqlParseAlgebraArgs) {
    super(args);
    this.prefixes = Object.freeze(this.prefixes);
  }

  public async test(action: IActionSparqlParse): Promise<IActorTest> {
    if (action.queryFormat && action.queryFormat !== 'sparql') {
      throw new Error('This actor can only parse SPARQL queries');
    }
    return true;
  }

  public async run(action: IActionSparqlParse): Promise<IActorSparqlParseOutput> {
    const parser = new SparqlParser({ prefixes: this.prefixes, baseIRI: action.baseIRI });
    // Resets the identifier counter used for blank nodes
    // provides nicer and more consistent output if there are multiple calls
    (<any> parser)._resetBlanks();
    const parsedSyntax = parser.parse(action.query);
    const baseIRI = parsedSyntax.type === 'query' ? parsedSyntax.base : undefined;
    return {
      baseIRI,
      operation: translate(parsedSyntax,
        { quads: true, prefixes: this.prefixes, blankToVariable: true, baseIRI: action.baseIRI }),
    };
  }
}

export interface IActorSparqlParseAlgebraArgs
  extends IActorArgs<IActionSparqlParse, IActorTest, IActorSparqlParseOutput> {
  /**
   * Default prefixes to use
   */
  prefixes?: Record<string, string>;
}
