import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { ActionContext, type IActorTest } from '@comunica/core';
import type {
  IQueryOperationResultBindings,
  IActionContext,
  IQueryOperationResult,
  MetadataQuads,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { getTermsNested, getVariables, uniqTerms } from 'rdf-terms';
import { Algebra } from 'sparqlalgebrajs';
import { BindingsToQuadsIterator } from './BindingsToQuadsIterator';
import { MediatorProcessIterator } from '@comunica/bus-process-iterator';

/**
 * A comunica Construct Query Operation Actor.
 */
export class ActorQueryOperationConstruct extends ActorQueryOperationTypedMediated<Algebra.Construct> {
  public readonly mediatorProcessIterator: MediatorProcessIterator;

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
      .apply([], patterns.map(pattern => getVariables(getTermsNested(pattern)))));
  }

  public async testOperation(_operation: Algebra.Construct, _context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operationOriginal: Algebra.Construct, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Apply a projection on our CONSTRUCT variables first, as the query may contain other variables as well.
    const variables: RDF.Variable[] = ActorQueryOperationConstruct.getVariables(operationOriginal.template);
    const operation: Algebra.Operation = { type: Algebra.types.PROJECT, input: operationOriginal.input, variables };

    // Evaluate the input query
    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation, context }),
    );

    // Construct triples using the result based on the pattern.
    // If it's a DESCRIBE query don't apply the blank node localisation.
    const _quadStream: AsyncIterator<RDF.Quad> = new BindingsToQuadsIterator(
      operationOriginal.template,
      output.bindingsStream,
    );

    
    // Apply iterator processing actors on quad stream
    const { stream } = await this.mediatorProcessIterator.mediate({
      type: "quad",
      streamSource: this.name,
      stream: _quadStream, 
      context: new ActionContext()
    });
    const quadStream = stream;

    // Let the final metadata contain the estimated number of triples
    const metadata: (() => Promise<MetadataQuads>) = () => output.metadata().then(meta => ({
      ...meta,
      order: undefined,
      cardinality: {
        type: meta.cardinality.type,
        value: meta.cardinality.value * operationOriginal.template.length,
      },
      canContainUndefs: false,
      availableOrders: undefined,
    }));

    return {
      metadata,
      quadStream,
      type: 'quads',
    };
  }
}


export interface IActorQueryOperationConstructArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for applying processing the filtered binding stream
   */
  mediatorProcessIterator: MediatorProcessIterator;
}
