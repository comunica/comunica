import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { SingletonIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Service Query Operation Actor.
 * It unwraps the SERVICE operation and executes it on the given source.
 */
export class ActorQueryOperationService extends ActorQueryOperationTypedMediated<Algebra.Service> {
  public readonly forceSparqlEndpoint: boolean;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorQueryOperationServiceArgs) {
    super(args, 'service');
  }

  public async testOperation(operation: Algebra.Service, _context: IActionContext): Promise<TestResult<IActorTest>> {
    if (operation.name.termType !== 'NamedNode') {
      return failTest(`${this.name} can only query services by IRI, while a ${operation.name.termType} was given.`);
    }
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Service, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Identify the SERVICE target as query source
    const { querySource } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: {
        value: operation.name.value,
        type: this.forceSparqlEndpoint ? 'sparql' : undefined,
      },
      context,
    });

    // Attach the source to the operation, and execute
    let output: IQueryOperationResultBindings;
    try {
      output = getSafeBindings(await this.mediatorQueryOperation.mediate({
        operation: assignOperationSource(operation.input, querySource),
        context,
      }));
    } catch (error: unknown) {
      if (operation.silent) {
        // Emit a single empty binding
        const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
        const bindingsFactory = await BindingsFactory.create(
          this.mediatorMergeBindingsContext,
          context,
          dataFactory,
        );
        output = {
          bindingsStream: new SingletonIterator<RDF.Bindings>(bindingsFactory.bindings()),
          type: 'bindings',
          metadata: async() => ({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 1 },
            variables: [],
          }),
        };
        this.logWarn(context, `An error occurred when executing a SERVICE clause: ${(<Error> error).message}`);
      } else {
        throw error;
      }
    }

    return output;
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
