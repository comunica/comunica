import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
  MediatorQuerySourceIdentify,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IQuerySourceCompositeFile } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';

/**
 * A comunica Composite File Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifyCompositeFile extends ActorQuerySourceIdentify {
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQuerySourceIdentifyCompositeFileArgs) {
    super(args);
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest>> {
    if (action.querySourceUnidentified.type !== 'compositefile') {
      return failTest(
        `${this.name} requires a single query source with compositefile type to be present in the context.`,
      );
    }
    if (!Array.isArray((<IQuerySourceCompositeFile> action.querySourceUnidentified).value)) {
      return failTest(`${this.name} requires a compositefile source with an array of file URLs as value.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    const compositeSource = <IQuerySourceCompositeFile> action.querySourceUnidentified;
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const AF = new AlgebraFactory(dataFactory);

    // Create a combined RDF store from all file sources
    const store: RDF.Store = RdfStore.createDefault(true);

    for (const source of compositeSource.value) {
      // TODO: if we would run into performance issues due to this temporary index+query step,
      //  use a transient query-once index.
      const querySource = typeof source === 'string' ?
          (await this.mediatorQuerySourceIdentify.mediate({
            querySourceUnidentified: { type: 'file', value: source },
            context: action.context,
          })).querySource :
        source;

      // Get all quads from this source using a wildcard quad pattern
      const sourceQuadStream = querySource.source.queryQuads(
        AF.createPattern(
          dataFactory.variable('s'),
          dataFactory.variable('p'),
          dataFactory.variable('o'),
          dataFactory.variable('g'),
        ),
        action.context,
      );

      // Import quads into the combined store
      await new Promise<void>((resolve, reject) => {
        store.import(<RDF.Stream<RDF.Quad>><unknown> sourceQuadStream)
          .on('error', reject)
          .once('end', resolve);
      });
    }

    const querySource = new QuerySourceRdfJs(
      store,
      dataFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
    );
    querySource.referenceValue = compositeSource.value.join('\n');
    querySource.toString = () => `QuerySourceRdfJs(composite: ${compositeSource.value.join(',')})`;

    return {
      querySource: {
        source: querySource,
        context: compositeSource.context,
      },
    };
  }
}

export interface IActorQuerySourceIdentifyCompositeFileArgs extends IActorQuerySourceIdentifyArgs {
  /**
   * The query source identify mediator.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
