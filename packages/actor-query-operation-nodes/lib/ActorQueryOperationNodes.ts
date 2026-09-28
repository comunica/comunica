import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, failTest } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult, IQuerySourceWrapper } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  assignOperationSource,
  doesShapeAcceptOperation,
  getOperationSource,
  getSafeBindings,
} from '@comunica/utils-query-operation';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL nodes operations.
 */
export class ActorQueryOperationNodes extends ActorQueryOperationTypedMediated<Algebra.Nodes> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'nodes');
  }

  public async testOperation(operation: Algebra.Nodes, _context: IActionContext): Promise<TestResult<IActorTest>> {
    if (!getOperationSource(operation)) {
      return failTest(`Actor ${this.name} requires an operation with source annotation.`);
    }
    return passTestVoid();
  }

  public async runOperation(
    operation: Algebra.Nodes,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const source: IQuerySourceWrapper = getOperationSource(operation)!;

    // We run the query DISTINCT { { ?VAR ?p ?x ?g } UNION { ?x ?p ?VAR ?g } }, to get all possible nodes in the graph
    const varP = dataFactory.variable('__p');
    const varX = dataFactory.variable('__x');
    const patterns = [
      algebraFactory.createPattern(operation.variable, varP, varX, operation.graph),
      algebraFactory.createPattern(varX, varP, operation.variable, operation.graph),
    ];

    // If the source accepts it, let it evaluate the whole query projected onto the nodes, so it returns each only once.
    // A variable graph is projected as well, unless it is the nodes variable, as a projection can not repeat variables.
    const variables = [ operation.variable ];
    if (operation.graph.termType === 'Variable' && !operation.graph.equals(operation.variable)) {
      variables.push(operation.graph);
    }
    const nodesOperation = algebraFactory.createDistinct(
      algebraFactory.createProject(algebraFactory.createUnion(patterns), variables),
    );
    if (doesShapeAcceptOperation(await source.source.getSelectorShape(context), nodesOperation)) {
      return this.mediatorQueryOperation.mediate({ context, operation: assignOperationSource(nodesOperation, source) });
    }

    // Otherwise, only let the source evaluate the patterns
    const result = getSafeBindings(
      await this.mediatorQueryOperation.mediate({
        context,
        operation: algebraFactory.createDistinct(algebraFactory.createUnion(
          patterns.map(pattern => assignOperationSource(pattern, source)),
        )),
      }),
    );
    const bindingsStream = result.bindingsStream
      .map(bindings => bindings.delete(varP).delete(varX));

    return { type: 'bindings', bindingsStream, metadata: result.metadata };
  }
}
