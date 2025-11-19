import { ActorQueryProcess } from '@comunica/bus-query-process';
import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  IQueryProcessSequential,
} from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { ActionContextKey, failTest, passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, transformer } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { toAst } from '@traqula/algebra-sparql-1-2';
import type { Algebra as TraqualAlgebra } from '@traqula/algebra-transformations-1-2';
import { traqulaIndentation } from '@traqula/core';
import { Generator } from '@traqula/generator-sparql-1-2';

/**
 * A comunica Explain Query Query Process Actor.
 */
export class ActorQueryProcessExplainQuery extends ActorQueryProcess {
  /**
   * A query string generator that has an indentation of -1,
   * meaning it does not print newlines as part of its query structure.
   * We also put the indentIncrements to 0 so it does not change the indentation.
   * @protected
   */
  protected static readonly queryStringGenerator = new Generator({ [traqulaIndentation]: 0, indentInc: 2 });

  public readonly queryProcessor: IQueryProcessSequential;

  public constructor(args: IActorQueryProcessExplainServiceArgs) {
    super(args);
    this.queryProcessor = args.queryProcessor;
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
      data = ActorQueryProcessExplainQuery.operationToQuery(operation);
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

  /**
   * Convert an operation to a query for this pattern.
   * @param {Algebra.Operation} operation A query operation.
   * @return {string} A query string.
   */
  public static operationToQuery(operation: Algebra.Operation): string {
    // This query source only handles the Known Algebra from @comunica/utils-algebra.
    // It will likely throw when unknown algebra operations are being translated
    // or the translation will not happen correctly.
    // TODO: add a query generation bus to Comunica to mitigate this problem.
    const ast = toAst(<TraqualAlgebra.Operation> operation);
    return this.queryStringGenerator.generate(ast).trim();
  }
}

export interface IActorQueryProcessExplainServiceArgs extends IActorQueryProcessArgs {
  queryProcessor: IQueryProcessSequential;
}
