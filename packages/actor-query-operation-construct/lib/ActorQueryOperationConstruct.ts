import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {AsyncIterator, EmptyIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {getTerms, getVariables, uniqTerms} from "rdf-terms";
import {Algebra} from "sparqlalgebrajs";
import {BindingsToQuadsIterator} from "./BindingsToQuadsIterator";

/**
 * A comunica Construct Query Operation Actor.
 */
export class ActorQueryOperationConstruct extends ActorQueryOperationTypedMediated<Algebra.Construct> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'construct');
  }

  /**
   * Find all variables in a list of triple patterns.
   * @param {Algebra.Pattern[]} patterns An array of triple patterns.
   * @return {RDF.Variable[]} The variables in the triple patterns.
   */
  public static getVariables(patterns: RDF.BaseQuad[]): RDF.Variable[] {
    return uniqTerms([].concat.apply([], patterns.map((pattern) => getVariables(getTerms(pattern)))));
  }

  public async testOperation(pattern: Algebra.Construct, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Construct, context: ActionContext)
    : Promise<IActorQueryOperationOutputQuads> {
    // Apply a projection on our CONSTRUCT variables first, as the query may contain other variables as well.
    const variables: RDF.Variable[] = ActorQueryOperationConstruct.getVariables(pattern.template);
    const operation: Algebra.Operation = { type: 'project', input: pattern.input, variables };

    // Evaluate the input query
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation, context }));

    // construct triples using the result based on the pattern.
    const quadStream: AsyncIterator<RDF.Quad> = new BindingsToQuadsIterator(pattern.template, output.bindingsStream);

    // Let the final metadata contain the estimated number of triples
    let metadata: () => Promise<{[id: string]: any}> = null;
    if (output.metadata) {
      metadata = () => output.metadata().then((m) => {
        if (m) {
          if (m.totalItems) {
            return Object.assign({}, m, { totalItems: m.totalItems * pattern.template.length });
          }
          return m;
        }
        return null;
      });
    }

    return {
      metadata,
      quadStream,
      type: 'quads',
    };
  }

}
