import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IQueryOperationResultBindings,
  IActionContext,
  IQueryOperationResult,
  MetadataQuads,
  ComunicaDataFactory,
} from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { getTermsNested, getVariables, uniqTerms } from 'rdf-terms';
import { BindingsToQuadsIterator } from './BindingsToQuadsIterator';

/**
 * A comunica Construct Query Operation Actor.
 */
export class ActorQueryOperationConstruct extends ActorQueryOperationTypedMediated<Algebra.Construct> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.CONSTRUCT);
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

  public async testOperation(_operation: Algebra.Construct, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operationOriginal: Algebra.Construct, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Apply a projection on our CONSTRUCT variables first, as the query may contain other variables as well.
    const variables: RDF.Variable[] = ActorQueryOperationConstruct.getVariables(operationOriginal.template);
    const operation = algebraFactory.createProject(operationOriginal.input, variables);

    // Evaluate the input query
    const output: IQueryOperationResultBindings = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation, context }),
    );

    // Construct triples using the result based on the pattern.
    // If it's a DESCRIBE query don't apply the blank node localisation.
    const quadStream: AsyncIterator<RDF.Quad> = new BindingsToQuadsIterator(
      dataFactory,
      operationOriginal.template,
      output.bindingsStream,
    );

    // Let the final metadata contain the estimated number of triples
    const metadata: (() => Promise<MetadataQuads>) = () => output.metadata().then(meta => ({
      ...meta,
      order: undefined,
      cardinality: {
        type: meta.cardinality.type,
        value: meta.cardinality.value * operationOriginal.template.length,
      },
      availableOrders: undefined,
    }));

    return {
      metadata,
      quadStream,
      type: 'quads',
    };
  }
}
