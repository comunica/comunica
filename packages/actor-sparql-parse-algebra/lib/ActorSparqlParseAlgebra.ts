import {ActorSparqlParse, IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActorArgs, IActorTest} from "@comunica/core";
import {translate} from "sparqlalgebrajs";
import {Parser as SparqlParser} from "sparqljs";

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorSparqlParseAlgebra extends ActorSparqlParse {

  public readonly prefixes: {[id: string]: string};

  constructor(args: IActorSparqlParseAlgebraArgs) {
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
    // TODO: will have to remove <any> once sparql.js types are updated
    const parser = new SparqlParser(<any> { prefixes: this.prefixes, baseIRI: action.baseIRI });
    // resets the identifier counter used for blank nodes
    // provides nicer and more consistent output if there are multiple calls
    (<any> parser)._resetBlanks();
    const parsedSyntax = parser.parse(action.query);
    const baseIRI: string = parsedSyntax.type === 'query' ? parsedSyntax.base : null;
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
  prefixes?: { [id: string]: string };
}
