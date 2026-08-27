import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { failTest, passTestVoid, type IActorTest, type TestResult } from '@comunica/core';
import type { IActionContext, SourceType } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Optimize Query Operation Set Sources From Dataset Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (!action.context.get(KeysQueryOperation.fromNamedAsSources)) {
      return failTest('This actor can only be used when fromNamedAsSources is enabled.');
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
    const namedGraphs: string[] = [];

    algebraUtils.visitOperation(operation, {
      from: {
        visitor(op: Algebra.From) {
          if (op.default) {
            defaultGraphs.push(...op.default.map((graph: RDF.NamedNode) => graph.value));
          }
          if (op.named) {
            namedGraphs.push(...op.named.map((graph: RDF.NamedNode) => graph.value));
          }
        },
      },
    });

    return { defaultGraphs, namedGraphs };
  }

  public static appendSources(context: IActionContext, clauses: IDatasetClauses): IActionContext {
    const existingSources: SourceType[] = context.get(KeysInitQuery.querySourcesUnidentified) ?? [];

    const mergedSources = [ ...existingSources, ...clauses.defaultGraphs, ...clauses.namedGraphs ].filter(
      (source, index, self) => index === self.indexOf(source),
    );

    return context.set(KeysInitQuery.querySourcesUnidentified, mergedSources);
  }

  public static stripDatasetClauses(operation: Algebra.Operation): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      from: {
        transform(op: Algebra.From) {
          return op.input;
        },
      },
    });
  }
}

export interface IDatasetClauses {
  defaultGraphs: string[];
  namedGraphs: string[];
}
