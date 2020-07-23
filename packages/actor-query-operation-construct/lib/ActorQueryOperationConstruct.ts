import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads,
  IActorQueryOperationTypedMediatedArgs,
} from '@comunica/bus-query-operation';
import { ActionContext, IActorTest } from '@comunica/core';
import { AsyncIterator } from 'asynciterator';
import * as RDF from 'rdf-js';
import { getTerms, getVariables, uniqTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import { BindingsToQuadsIterator } from './BindingsToQuadsIterator';

/**
 * A comunica Construct Query Operation Actor.
 */
export class ActorQueryOperationConstruct extends ActorQueryOperationTypedMediated<Algebra.Construct> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'construct');
  }

  /**
   * Find all variables in a list of triple patterns.
   * @param {Algebra.Pattern[]} patterns An array of triple patterns.
   * @return {RDF.Variable[]} The variables in the triple patterns.
   */
  public static getVariables(patterns: RDF.BaseQuad[]): RDF.Variable[] {
    return uniqTerms((<RDF.Variable[]> []).concat
      .apply([], patterns.map(pattern => getVariables(getTerms(pattern)))));
  }

  public async testOperation(pattern: Algebra.Construct, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Construct, context: ActionContext):
  Promise<IActorQueryOperationOutputQuads> {
    // Apply a projection on our CONSTRUCT variables first, as the query may contain other variables as well.
    const variables: RDF.Variable[] = ActorQueryOperationConstruct.getVariables(pattern.template);
    const operation: Algebra.Operation = { type: 'project', input: pattern.input, variables };

    // Evaluate the input query
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation, context }),
    );

    // Construct triples using the result based on the pattern.
    const quadStream: AsyncIterator<RDF.Quad> = new BindingsToQuadsIterator(pattern.template, output.bindingsStream);

    // Let the final metadata contain the estimated number of triples
    let metadata: (() => Promise<{[id: string]: any}>) | undefined;
    if (output.metadata) {
      metadata = () => (<() => Promise<{[id: string]: any}>> output.metadata)().then(meta => {
        if (meta.totalItems) {
          return { ...meta, totalItems: meta.totalItems * pattern.template.length };
        }
        return meta;
      });
    }

    return {
      metadata,
      quadStream,
      type: 'quads',
    };
  }
}
