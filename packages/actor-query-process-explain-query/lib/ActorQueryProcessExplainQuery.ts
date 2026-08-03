import { ActorQueryProcess } from '@comunica/bus-query-process';
import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  IQueryProcessSequential,
} from '@comunica/bus-query-process';
import type { MediatorQuerySerialize } from '@comunica/bus-query-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { ActionContextKey, failTest, passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, transformer } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Explain Query Query Process Actor.
 */
export class ActorQueryProcessExplainQuery extends ActorQueryProcess {
  public readonly queryProcessor: IQueryProcessSequential;
  public readonly mediatorQuerySerialize: MediatorQuerySerialize;

  public constructor(args: IActorQueryProcessExplainServiceArgs) {
    super(args);
    this.queryProcessor = args.queryProcessor;
    this.mediatorQuerySerialize = args.mediatorQuerySerialize;
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    if ((action.context.get(KeysInitQuery.explain) ??
      action.context.get(new ActionContextKey('explain'))) !== 'query') {
      return failTest(`${this.name} can only explain in 'query' mode.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Parse and optimize the query
    let { operation, context } = await this.queryProcessor.parse(action.query, action.context);
    ({ operation, context } = await this.queryProcessor.optimize(operation, context));

    // Convert source annotations to SERVICE clauses
    const AF = new AlgebraFactory();
    operation = ActorQueryProcessExplainQuery.sourceAnnotationToServices(
      AF,
      context.getSafe(KeysInitQuery.dataFactory),
      operation,
    );

    // Serialize the operation to a SPARQL query
    let data: string;
    if (operation.type === Algebra.Types.UNION) {
      // This can happen if it was determined during optimization that the query has zero results.
      data = 'SELECT * WHERE { FILTER(false) }';
    } else {
      data = (await this.mediatorQuerySerialize.mediate({
        queryFormat: { language: 'sparql', version: '1.1' },
        operation,
        newlines: true,
        indentWidth: 2,
        context,
      })).query;
    }

    return {
      result: {
        explain: true,
        type: 'query',
        data,
      },
    };
  }

  public static sourceAnnotationToServices(
    algebraFactory: AlgebraFactory,
    dataFactory: RDF.DataFactory,
    operation: Algebra.Operation,
  ): Algebra.Operation {
    // TODO: The casts below should not be necessary.
    return <Algebra.Operation> transformer.transformObject(operation, (subOperationUntyped: object) => {
      const subOperation = <Algebra.Operation> subOperationUntyped;
      const source = getOperationSource(subOperation);
      if (source) {
        return algebraFactory.createService(
          subOperation,
          typeof source.source.referenceValue === 'string' ?
            dataFactory.namedNode(source.source.referenceValue) :
            dataFactory.namedNode(`comunica:${source.source.referenceValue.constructor.name}`),
          source.context?.get(KeysInitQuery.lenient),
        );
      }
      return subOperation;
    });
  }
}

export interface IActorQueryProcessExplainServiceArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
  /**
   * Mediator for serializing queries.
   */
  mediatorQuerySerialize: MediatorQuerySerialize;
}
