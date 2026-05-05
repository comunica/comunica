import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type {
  AsyncServiceExecutor,
  Bindings,
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
} from '@comunica/types';
import { algebraUtils } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator } from 'asynciterator';

/**
 * A query source wrapper for custom SERVICE executors.
 */
export class QuerySourceServiceExecutor implements IQuerySource {
  public readonly supportsServiceOperationInjection = true;
  public readonly referenceValue: string;
  public readonly serviceExecutor: AsyncServiceExecutor;

  public constructor(referenceValue: string, serviceExecutor: AsyncServiceExecutor) {
    this.referenceValue = referenceValue;
    this.serviceExecutor = serviceExecutor;
  }

  public async getFilterFactor(_context: IActionContext): Promise<number> {
    return 1;
  }

  public async getSelectorShape(_context: IActionContext): Promise<FragmentSelectorShape> {
    return {
      type: 'operation',
      operation: {
        operationType: 'wildcard',
      },
    };
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    const serviceOperation = context.getSafe(KeysQueryOperation.serviceOperation);
    const lenient = Boolean(context.get(KeysInitQuery.lenient));
    const silentFallback = lenient ? QuerySourceServiceExecutor.createSilentFallbackBinding(context) : undefined;
    const serviceBindingsPromise = Promise.resolve()
      .then(async() => this.serviceExecutor(
        { ...serviceOperation, input: operation },
        context.get(KeysQueryOperation.joinBindings),
        context,
        options,
      ));
    const bindings = new class extends BufferedIterator<Bindings> {
      private started = false;
      private emittedBindings = false;
      private usedSilentFallback = false;

      public constructor() {
        super({ autoStart: false });
      }

      public override _read(_count: number, done: () => void): void {
        if (this.started) {
          done();
          return;
        }
        this.started = true;

        serviceBindingsPromise
          .then((serviceBindings) => {
            serviceBindings.on('data', (binding: Bindings) => {
              this.emittedBindings = true;
              this._push(binding);
            });
            serviceBindings.on('end', () => this.close());
            serviceBindings.on('error', (error) => {
              if (lenient && !this.emittedBindings) {
                this.emitSilentFallback();
              } else if (lenient) {
                this.close();
              } else {
                this.destroy(error);
              }
            });
          })
          .catch((error) => {
            if (lenient) {
              this.emitSilentFallback();
            } else {
              this.destroy(error);
            }
          })
          .finally(done);
      }

      private emitSilentFallback(): void {
        if (this.usedSilentFallback) {
          return;
        }
        this.usedSilentFallback = true;
        this.setProperty('metadata', silentFallback!.metadata);
        this.emittedBindings = true;
        this._push(silentFallback!.binding);
        this.close();
      }
    }();
    serviceBindingsPromise
      .then((serviceBindings) => {
        const metadata: Record<string, any> | undefined = serviceBindings.getProperty('metadata');
        if (metadata) {
          return metadata;
        }
        serviceBindings.getProperty('metadata', (metadata) => {
          const serviceMetadata = <Record<string, any>> metadata;
          bindings.setProperty('metadata', QuerySourceServiceExecutor.withMetadataState(serviceMetadata));
        });
        return QuerySourceServiceExecutor.createFallbackMetadata(operation, context);
      })
      .catch((error) => {
        if (lenient) {
          return silentFallback!.metadata;
        }
        throw error;
      })
      .then(metadata => bindings.setProperty('metadata', QuerySourceServiceExecutor.withMetadataState(metadata)))
      .catch(error => bindings.destroy(error));
    return bindings;
  }

  public queryQuads(_operation: Algebra.Operation, _context: IActionContext): never {
    throw new Error('Custom SERVICE executors can only produce bindings results.');
  }

  public async queryBoolean(_operation: Algebra.Ask, _context: IActionContext): Promise<boolean> {
    throw new Error('Custom SERVICE executors can only produce bindings results.');
  }

  public async queryVoid(_operation: Algebra.Operation, _context: IActionContext): Promise<void> {
    throw new Error('Custom SERVICE executors can only produce bindings results.');
  }

  public toString(): string {
    return `QuerySourceServiceExecutor(${this.referenceValue})`;
  }

  private static withMetadataState(metadata: Record<string, any>): Record<string, any> {
    if (!metadata.state) {
      metadata = {
        ...metadata,
        state: new MetadataValidationState(),
      };
    }
    return metadata;
  }

  private static createFallbackMetadata(operation: Algebra.Operation, context: IActionContext): Record<string, any> {
    const variables: RDF.Variable[] = [];
    const variableLabels = new Set<string>();
    const addVariable = (variable: RDF.Variable): void => {
      if (!variableLabels.has(variable.value)) {
        variableLabels.add(variable.value);
        variables.push(variable);
      }
    };

    for (const variable of algebraUtils.inScopeVariables(operation)) {
      addVariable(variable);
    }
    for (const variable of context.get(KeysQueryOperation.joinBindings)?.keys() ?? []) {
      addVariable(variable);
    }

    return {
      state: new MetadataValidationState(),
      cardinality: { type: 'estimate', value: 1 },
      variables: variables.map(variable => ({ variable, canBeUndef: false })),
    };
  }

  private static createSilentFallbackBinding(context: IActionContext): {
    binding: Bindings;
    metadata: Record<string, any>;
  } {
    const dataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = new BindingsFactory(dataFactory);
    const binding = context.get(KeysQueryOperation.joinBindings) ?? bindingsFactory.bindings();
    return {
      binding,
      metadata: {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 1 },
        variables: [ ...binding.keys() ].map(variable => ({ variable, canBeUndef: false })),
      },
    };
  }
}
