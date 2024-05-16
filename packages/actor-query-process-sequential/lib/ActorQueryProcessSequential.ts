import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { materializeOperation } from '@comunica/bus-query-operation';
import type { MediatorQueryParse } from '@comunica/bus-query-parse';
import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  IQueryProcessSequential,
  IQueryProcessSequentialOutput,
} from '@comunica/bus-query-process';
import {
  ActorQueryProcess,
} from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { ActionContextKey } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResult,
  QueryFormatType,
} from '@comunica/types';

import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Sequential Query Process Actor.
 */
export class ActorQueryProcessSequential extends ActorQueryProcess implements IQueryProcessSequential {
  public readonly mediatorContextPreprocess: MediatorContextPreprocess;
  public readonly mediatorQueryParse: MediatorQueryParse;
  public readonly mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryProcessSequentialArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<IActorTest> {
    if (action.context.get(KeysInitQuery.explain) || action.context.get(new ActionContextKey('explain'))) {
      throw new Error(`${this.name} is not able to explain queries.`);
    }
    return true;
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Run all query processing steps in sequence
    let { operation, context } = await this.parse(action.query, action.context);
    ({ operation, context } = await this.optimize(operation, context));
    const output = await this.evaluate(operation, context);

    return { result: output };
  }

  public async parse(query: QueryFormatType, context: IActionContext): Promise<IQueryProcessSequentialOutput> {
    // Pre-processing the context
    context = (await this.mediatorContextPreprocess.mediate({ context })).context;

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      // Save the original query string in the context
      context = context.set(KeysInitQuery.queryString, query);

      const baseIRI: string | undefined = context.get(KeysInitQuery.baseIRI);
      const queryFormat: RDF.QueryFormat = context.get(KeysInitQuery.queryFormat)!;
      const queryParseOutput = await this.mediatorQueryParse.mediate({ context, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        context = context.set(KeysInitQuery.baseIRI, queryParseOutput.baseIRI);
      }
    } else {
      operation = query;
    }

    // Apply initial bindings in context
    if (context.has(KeysInitQuery.initialBindings)) {
      const bindingsFactory = await BindingsFactory
        .create(this.mediatorMergeBindingsContext, context);
      operation = materializeOperation(operation, context.get(KeysInitQuery.initialBindings)!, bindingsFactory);

      // Delete the query string from the context, since our initial query might have changed
      context = context.delete(KeysInitQuery.queryString);
    }

    return { operation, context };
  }

  public async optimize(operation: Algebra.Operation, context: IActionContext): Promise<IQueryProcessSequentialOutput> {
    // Save initial query in context
    context = context.set(KeysInitQuery.query, operation);

    ({ operation, context } = await this.mediatorOptimizeQueryOperation.mediate({ context, operation }));

    // Save original query in context
    context = context.set(KeysInitQuery.query, operation);

    return { operation, context };
  }

  public async evaluate(operation: Algebra.Operation, context: IActionContext): Promise<IQueryOperationResult> {
    const output = await this.mediatorQueryOperation.mediate({ context, operation });
    output.context = context;
    return output;
  }
}

export interface IActorQueryProcessSequentialArgs extends IActorQueryProcessArgs {
  /**
   * The context processing combinator
   */
  mediatorContextPreprocess: MediatorContextPreprocess;
  /**
   * The query parse mediator
   */
  mediatorQueryParse: MediatorQueryParse;
  /**
   * The query operation optimize mediator
   */
  mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
