import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  Bindings,
  IQueryOperationResult,
  IActionContext,
  BindingsStream,
  ComunicaDataFactory,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import {
  SingletonIterator,
  UnionIterator,
} from 'asynciterator';
import { Algebra, Factory } from 'sparqlalgebrajs';

/**
 * A comunica Path ZeroOrOne Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrOne extends ActorAbstractPath {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationPathZeroOrOneArgs) {
    super(args, Algebra.types.ZERO_OR_ONE_PATH);
  }

  public async runOperation(
    operation: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory);
    const predicate = <Algebra.ZeroOrOnePath> operation.predicate;
    const sources = this.getPathSources(predicate);

    const extra: Bindings[] = [];

    // Both subject and object non-variables
    if (operation.subject.termType !== 'Variable' &&
      operation.object.termType !== 'Variable' &&
      operation.subject.equals(operation.object)) {
      return {
        type: 'bindings',
        bindingsStream: new SingletonIterator<RDF.Bindings>(bindingsFactory.bindings()),
        metadata: () => Promise.resolve({
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 1 },
          variables: [],
        }),
      };
    }

    // Check if we require a distinct path operation
    const distinct = await this.isPathArbitraryLengthDistinct(algebraFactory, context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }
    context = distinct.context;

    // Create an operator that resolve to the "One" part
    const bindingsOne = getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: algebraFactory.createPath(operation.subject, predicate.path, operation.object, operation.graph),
    }));

    // Determine the bindings stream based on the variable-ness of subject and object
    let bindingsStream: BindingsStream;
    if (operation.subject.termType === 'Variable' && operation.object.termType === 'Variable') {
      // Both subject and object are variables
      // To determine the "Zero" part, we
      // query ?s ?p ?o. FILTER ?s = ?0, to get all possible namedNodes in de the db
      const varP = this.generateVariable(dataFactory, operation);
      const bindingsZero = getSafeBindings(
        await this.mediatorQueryOperation.mediate({
          context,
          operation: algebraFactory.createFilter(
            this.assignPatternSources(algebraFactory, algebraFactory
              .createPattern(operation.subject, varP, operation.object, operation.graph), sources),
            algebraFactory.createOperatorExpression('=', [
              algebraFactory.createTermExpression(operation.subject),
              algebraFactory.createTermExpression(operation.object),
            ]),
          ),
        }),
      ).bindingsStream.map(bindings => bindings.delete(varP));
      bindingsStream = new UnionIterator([
        bindingsZero,
        bindingsOne.bindingsStream,
      ], { autoStart: false });
    } else {
      // If subject or object is not a variable, then determining the "Zero" part is simple.
      if (operation.subject.termType === 'Variable') {
        extra.push(bindingsFactory.bindings([[ operation.subject, operation.object ]]));
      }
      if (operation.object.termType === 'Variable') {
        extra.push(bindingsFactory.bindings([[ operation.object, operation.subject ]]));
      }

      bindingsStream = bindingsOne.bindingsStream.prepend(extra);
    }

    return {
      type: 'bindings',
      bindingsStream,
      metadata: bindingsOne.metadata,
    };
  }
}
export interface IActorQueryOperationPathZeroOrOneArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
