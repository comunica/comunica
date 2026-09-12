import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysDereference, KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContext, failTest, passTestVoid } from '@comunica/core';
import type {
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
} from '@comunica/types';
import { Algebra, algebraUtils, inScopeVariables } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import {
  assignOperationSource,
  doesShapeAcceptOperation,
  getSafeBindings,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { SingletonIterator, TransformIterator } from 'asynciterator';

/**
 * A comunica Service Query Operation Actor.
 * It handles SERVICE clauses that survive query optimization, which are those with a variable target,
 * as the optimizer can not know that target before the variable has been bound.
 * Such a clause is evaluated once a bind-join has materialized its target into an IRI.
 */
export class ActorQueryOperationService extends ActorQueryOperationTypedMediated<Algebra.Service> {
  public readonly forceSparqlEndpoint: boolean;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorQueryOperationServiceArgs) {
    super(args, Algebra.Types.SERVICE);
    this.forceSparqlEndpoint = args.forceSparqlEndpoint;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
  }

  public async testOperation(operation: Algebra.Service, _context: IActionContext): Promise<TestResult<IActorTest>> {
    const termType: string = operation.name.termType;
    if (termType !== 'NamedNode' && termType !== 'Variable') {
      return failTest(`${this.name} can only query services by IRI or variable, while a ${termType} was given.`);
    }
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Service, context: IActionContext): Promise<IQueryOperationResult> {
    // A target that is still a variable can not be queried yet.
    // We return a placeholder output, which join actors use to determine that a bind-join is required,
    // which materializes the target into an IRI before this operation is executed again.
    if (operation.name.termType !== 'NamedNode') {
      // Variable targets are determined by the queried data, so they are only allowed when explicitly enabled.
      if (!context.get(KeysInitQuery.serviceAllowVariableTargets)) {
        throw new Error(`SERVICE clauses with a variable target are not allowed by default, as they let the queried data determine what is dereferenced. Enable them via the serviceAllowVariableTargets context entry.`);
      }
      return this.unboundPlaceholder(operation, context);
    }

    try {
      const querySource = await this.identifyTarget(operation, operation.name, context);
      const output = getSafeBindings(await this.mediatorQueryOperation.mediate({
        operation: await this.assignSource(operation.input, querySource, context),
        context,
      }));
      // Force resolution of the metadata, so that connection errors surface here instead of on the stream.
      await output.metadata();
      return output;
    } catch (error: unknown) {
      if (!operation.silent) {
        throw error;
      }
      this.logWarn(context, `An error occurred when executing a SERVICE clause: ${(<Error> error).message}`);
      return await this.emptySolution(context);
    }
  }

  /**
   * Identify the SERVICE target as a query source.
   */
  protected async identifyTarget(
    operation: Algebra.Service,
    target: RDF.NamedNode,
    context: IActionContext,
  ): Promise<IQuerySourceWrapper> {
    // Unless explicitly allowed, SERVICE targets may not be dereferenced from the local file system,
    // as queries from untrusted parties could otherwise read arbitrary local files.
    let sourceContext = context.get(KeysInitQuery.serviceAllowFileTargets) ?
      new ActionContext() :
      new ActionContext().set(KeysDereference.blockFileAccess, true);
    if (operation.silent) {
      sourceContext = sourceContext
        // Suppresses hard errors while dereferencing a SERVICE target that is a plain document.
        .set(KeysInitQuery.lenient, true)
        // Replaces errors from the source by a single empty solution.
        .set(KeysQueryOperation.silent, true);
    }
    const { querySource } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: {
        value: target.value,
        type: this.forceSparqlEndpoint ? 'sparql' : undefined,
        context: sourceContext,
      },
      context,
    });
    return querySource;
  }

  /**
   * Annotate the given operation with the given source.
   * The whole operation is annotated if the source accepts it (e.g. for SPARQL endpoints).
   * Otherwise, only the leaves are annotated, so that the remainder is evaluated locally.
   */
  protected async assignSource(
    operation: Algebra.Operation,
    querySource: IQuerySourceWrapper,
    context: IActionContext,
  ): Promise<Algebra.Operation> {
    const shape = await querySource.source.getSelectorShape(context);
    if (doesShapeAcceptOperation(shape, operation)) {
      return assignOperationSource(operation, querySource);
    }
    const leafHandler = {
      preVisitor: () => ({ continue: <const> false }),
      transform: (leafOp: Algebra.Operation) => assignOperationSource(leafOp, querySource),
    };
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.PATTERN]: leafHandler,
      [Algebra.Types.LINK]: leafHandler,
      [Algebra.Types.NPS]: leafHandler,
    });
  }

  protected unboundPlaceholder(operation: Algebra.Service, _context: IActionContext): IQueryOperationResultBindings {
    const variables = [
      ...inScopeVariables(operation.input),
      <RDF.Variable> operation.name,
    ].map(variable => ({ variable, canBeUndef: false }));
    return {
      type: 'bindings',
      bindingsStream: new TransformIterator<RDF.Bindings>(() => Promise.reject(new Error(
        `Tried to evaluate a SERVICE clause with unbound variable ?${operation.name.value}`,
      )), { autoStart: false }),
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
        variables,
        // Join actors must bind our target before this operation can be evaluated.
        operationRequired: true,
      }),
    };
  }

  protected async emptySolution(context: IActionContext): Promise<IQueryOperationResultBindings> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    return {
      bindingsStream: new SingletonIterator<RDF.Bindings>(bindingsFactory.bindings()),
      type: 'bindings',
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 1 },
        variables: [],
      }),
    };
  }
}

export interface IActorQueryOperationServiceArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * If the SERVICE target should be assumed to be a SPARQL endpoint.
   * @default {false}
   */
  forceSparqlEndpoint: boolean;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * The mediator for identifying query sources.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
