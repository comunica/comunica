import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { passTestVoid, type IActorTest, type TestResult } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { algebraUtils } from '@comunica/utils-algebra';

/**
 * A comunica Optimize Query Operation Set Sources From Dataset Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    // TODO: add context option to enable/disable (or do it in test)

    const datasetClauses = ActorOptimizeQueryOperationSetSourcesFromDataset.extractDatasetClauses(action.operation);

    if (datasetClauses.defaultGraphs.length === 0 && datasetClauses.namedGraphs.length === 0) {
      // No FROM/FROM NAMED present - nothing to do.
      return { operation: action.operation, context: action.context };
    }

    const context = ActorOptimizeQueryOperationSetSourcesFromDataset.appendSources(action.context, datasetClauses);
    const operation =
      ActorOptimizeQueryOperationSetSourcesFromDataset.stripDatasetClauses(action.operation);

    return { operation, context };
  }

  public static extractDatasetClauses(operation: Algebra.Operation): IDatasetClauses {
    const defaultGraphs: string[] = [];
    const namedGraphs: string[] = [];

    algebraUtils.visitOperation(operation, {
      from: {
        visitor(op: any) {
          if (op.default) {
            defaultGraphs.push(...op.default.map((graph: any) => graph.value ?? graph));
          }
          if (op.named) {
            namedGraphs.push(...op.named.map((graph: any) => graph.value ?? graph));
          }
        },
      },
    });

    return { defaultGraphs, namedGraphs };
  }

  public static appendSources(context: IActionContext, clauses: IDatasetClauses): IActionContext {
    const existingSources: any[] = context.get(KeysInitQuery.querySourcesUnidentified) ?? [];

    const newSources = [
      ...clauses.defaultGraphs.map(iri => ({ type: 'auto', value: iri })),
      ...clauses.namedGraphs.map(iri => ({ type: 'auto', value: iri })),
    ];

    const mergedSources = [ ...existingSources, ...newSources ].filter(
      (source, index, self) => index === self.findIndex(s => s.value === source.value),
    );

    return context.set(KeysInitQuery.querySourcesUnidentified, mergedSources);
  }

  public static stripDatasetClauses(operation: Algebra.Operation): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      from: {
        transform(copy: any) {
          return copy.input;
        },
      },
    });
  }
}

export interface IDatasetClauses {
  defaultGraphs: string[];
  namedGraphs: string[];
}
