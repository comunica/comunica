import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  MediatorQueryProcess,
} from '@comunica/bus-query-process';
import { ActorQueryProcess } from '@comunica/bus-query-process';
import { KeysMergeBindingsContext } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid, ActionContextKey } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { Bindings } from '@comunica/utils-bindings-factory';
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
    this.mediatorQueryProcess = args.mediatorQueryProcess;
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    if (action.context.get(KEY_CONTEXT_WRAPPED)) {
      return failTest('Unable to query process multiple times');
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    const context = action.context.set(KEY_CONTEXT_WRAPPED, true);
    action.context = context;

    // Run all query processing steps in sequence
    const output = await this.mediatorQueryProcess.mediate(action);
    // Currently this only supports adding source provenance to bindings
    if (output.result.type === 'bindings') {
      output.result.bindingsStream = this.addSourcesToBindings(output.result.bindingsStream);
    }
    return output;
  }

  public addSourcesToBindings(iterator: BindingsStream): BindingsStream {
    const ret = iterator.map((bindings) => {
      if (bindings instanceof Bindings) {
        // Get sources from bindings context. If no sources are found, this should produce binding with empty literal
        const source = <string []> bindings.getContextEntry(KeysMergeBindingsContext.sourcesBinding);
        const sourceAsLiteral = this.dataFactory.literal(JSON.stringify(source ?? []));
        bindings = bindings.set('_source', sourceAsLiteral);
      }
      return bindings;
    });

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
