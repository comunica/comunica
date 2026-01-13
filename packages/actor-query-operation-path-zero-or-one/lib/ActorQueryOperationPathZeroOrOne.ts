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
  MetadataBindings,
} from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import {
  SingletonIterator,
  UnionIterator,
} from 'asynciterator';

/**
 * A comunica Path ZeroOrOne Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrOne extends ActorAbstractPath {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationPathZeroOrOneArgs) {
    super(args, Algebra.Types.ZERO_OR_ONE_PATH);
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async runOperation(
    operation: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
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
      // query { ?s ?p ?x } UNION { ?x ?p ?s } , to get all possible namedNodes in de the db
      const varP = this.generateVariable(dataFactory, operation, 'p');
      const varX = this.generateVariable(dataFactory, operation, 'x');
      const bindingsZero = getSafeBindings(
        await this.mediatorQueryOperation.mediate({
          context,
          operation: algebraFactory.createUnion([
            this.assignPatternSources(algebraFactory, algebraFactory
              .createPattern(operation.subject, varP, varX, operation.graph), sources),
            this.assignPatternSources(algebraFactory, algebraFactory
              .createPattern(varX, varP, operation.subject, operation.graph), sources),
          ]),
        }),
      ).bindingsStream.map(bindings => bindings
        .delete(varP)
        .delete(varX)
        .set(<RDF.Variable> operation.object, bindings.get(<RDF.Variable> operation.subject)!));
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

    const metadata = async(): Promise<MetadataBindings> => {
      const innerMetadata = await bindingsOne.metadata();
      return {
        ...innerMetadata,
        cardinality: {
          ...innerMetadata.cardinality,
          // Add one to cardinality because we allow *ZERO* or more.
          value: innerMetadata.cardinality.value + 1,
        },
      };
    };

    return {
      type: 'bindings',
      bindingsStream,
      metadata,
    };
  }
}
export interface IActorQueryOperationPathZeroOrOneArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
