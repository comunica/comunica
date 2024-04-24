import type { Bindings } from '@comunica/bindings-factory';
import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  MediatorQueryProcess,
} from '@comunica/bus-query-process';
import { ActorQueryProcess } from '@comunica/bus-query-process';
import { KeysMergeBindingsContext } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { ActionContextKey } from '@comunica/core';
import type { BindingsStream, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

/**
 * A comunica Annotate Source Binding Query Process Actor.
 */
export class ActorQueryProcessAnnotateSourceBinding extends ActorQueryProcess {
  private readonly dataFactory: RDF.DataFactory;
  public readonly mediatorQueryProcess: MediatorQueryProcess;

  public constructor(args: IActorQueryProcessAnnotateSourceBindingArgs) {
    super(args);
    this.dataFactory = new DataFactory();
  }

  public async test(action: IActionQueryProcess): Promise<IActorTest> {
    if (action.context.get(KEY_CONTEXT_WRAPPED)) {
      throw new Error('Unable to query process multiple times');
    }
    return true;
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Run all query processing steps in sequence
    const { result } = await this.mediatorQueryProcess.mediate(action);
    // Currently this only supports adding source provenance to bindings
    if (result.type === 'bindings') {
      result.bindingsStream = this.addSourcesToBindings(result.bindingsStream);
    }
    return { result };
  }

  public addSourcesToBindings(iterator: BindingsStream): BindingsStream {
    const ret = iterator.transform({
      map: (bindings) => {
        // Get source from bindings context. If no source is found, this should produce binding with empty literal
        const source = <string []> (<Bindings> bindings).getContextEntry(KeysMergeBindingsContext.sourceBinding);

        // Handle empty binding source
        const sourceAsLiteral = source ?
          this.dataFactory.literal(JSON.stringify(source)) :
          this.dataFactory.literal(JSON.stringify([]));

        bindings = bindings.set('_source', sourceAsLiteral);
        return bindings;
      },
      autoStart: false,
    });

    function inheritMetadata(): void {
      iterator.getProperty('metadata', (metadata: MetadataBindings) => {
        ret.setProperty('metadata', metadata);
        metadata.state.addInvalidateListener(inheritMetadata);
      });
    }
    inheritMetadata();

    return ret;
  }
}

export interface IActorQueryProcessAnnotateSourceBindingArgs extends IActorQueryProcessArgs {
  /**
   * The query process mediator so we can call our wrapped actor
   */
  mediatorQueryProcess: MediatorQueryProcess;
}

export const KEY_CONTEXT_WRAPPED = new ActionContextKey<boolean>(
  '@comunica/actor-query-process-annotate-source-binding:wrapped',
);
