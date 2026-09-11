import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, failTest, passTestVoid, type IActorTest, type TestResult } from '@comunica/core';
import type { IActionContext, SourceType } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Optimize Query Operation Set Sources From Dataset Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (!action.context.get(KeysQueryOperation.dereferenceFromNamed)) {
      return failTest('This actor can only be used when dereferenceFromNamed is enabled.');
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const datasetClauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(action.operation);

    if (datasetClauses.defaultGraphs.length === 0 && datasetClauses.namedGraphs.length === 0) {
      return { operation: action.operation, context: action.context };
    }

    const context = ActorOptimizeQueryOperationSetSourcesFromDataset.appendSources(action.context, datasetClauses);
    const operation =
      ActorOptimizeQueryOperationSetSourcesFromDataset.stripDatasetClauses(action.operation);

    return { operation, context };
  }

  public static extractDatasetClauses(operation: Algebra.Operation): IDatasetClauses {
    const defaultGraphs: string[] = [];
    const namedGraphs: RDF.NamedNode[] = [];

    if (operation.type === 'from') {
      const fromOp = <Algebra.From> operation;
      if (fromOp.default) {
        defaultGraphs.push(...fromOp.default.map((graph: RDF.NamedNode) => graph.value));
      }
      if (fromOp.named) {
        namedGraphs.push(...fromOp.named);
      }
    }

    return { defaultGraphs, namedGraphs };
  }

  public static appendSources(context: IActionContext, clauses: IDatasetClauses): IActionContext {
    const existingSources: SourceType[] = context.get(KeysInitQuery.querySourcesUnidentified) ?? [];
    const conflictMode = context.get(KeysQueryOperation.dereferenceFromNamedConflictMode);

    const namedGraphSources: SourceType[] = clauses.namedGraphs.map(namedNode => ({
      value: namedNode.value,
      context: new ActionContext({
        [KeysQueryOperation.sourceAsNamedGraph.name]: namedNode,
        ...(conflictMode && { [KeysQueryOperation.dereferenceFromNamedConflictMode.name]: conflictMode }),
      }),
    }));

    const mergedSources = [
      ...new Set([ ...existingSources, ...clauses.defaultGraphs ]),
      ...namedGraphSources,
    ];

    return context.set(KeysInitQuery.querySourcesUnidentified, mergedSources);
  }

  /**
   * According to SPARQL 1.2 grammar, a FROM and FROM named clause can only appear in the top level Query
   */

  public static stripDatasetClauses(operation: Algebra.Operation): Algebra.Operation {
    if (operation.type === 'from') {
      return (<Algebra.From> operation).input;
    }
    return operation;
  }
}

export interface IDatasetClauses {
  defaultGraphs: string[];
  namedGraphs: RDF.NamedNode[];
}
