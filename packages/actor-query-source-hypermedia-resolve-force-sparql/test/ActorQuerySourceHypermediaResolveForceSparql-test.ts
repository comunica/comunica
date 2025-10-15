import type {
  IActionQuerySourceIdentifyHypermedia,
  MediatorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySource } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorQuerySourceHypermediaResolveForceSparql } from '../lib/ActorQuerySourceHypermediaResolveForceSparql';
import '@comunica/utils-jest';

describe('ActorQuerySourceHypermediaResolveForceSparql', () => {
  let bus: any;
  let mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorMetadataAccumulate = <MediatorRdfMetadataAccumulate>{
      async mediate(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
        if (action.mode === 'initialize') {
          return {
            metadata: {
              cardinality: { type: 'exact', value: 0 },
            },
          };
        }
        return { metadata: { ...action.accumulatedMetadata, ...action.appendingMetadata }};
      },
    };
    mediatorQuerySourceIdentifyHypermedia = <MediatorQuerySourceIdentifyHypermedia> {
      async mediate(input: IActionQuerySourceIdentifyHypermedia) {
        await arrayifyStream(input.quads);
        return {
          dataset: 'MYDATASET',
          source: <IQuerySource> <any> 'QUERYSOURCE',
        };
      },
    };
  });

  describe('An ActorQuerySourceHypermediaResolveForceSparql instance', () => {
    let actor: ActorQuerySourceHypermediaResolveForceSparql;

    beforeEach(() => {
      actor = new ActorQuerySourceHypermediaResolveForceSparql({
        name: 'actor',
        bus,
        mediatorMetadataAccumulate,
        mediatorQuerySourceIdentifyHypermedia,
      });
    });

    describe('test', () => {
      it('should pass for a SPARQL endpoint', async() => {
        await expect(actor.test({
          url: 'URL',
          forceSourceType: 'sparql',
          context: new ActionContext()
            .set(KeysQueryOperation.querySources, [ <any> 'abc' ]),
        })).resolves.toPassTestVoid();
      });

      it('should not pass for multiple sources', async() => {
        await expect(actor.test({
          url: 'URL',
          forceSourceType: 'sparql',
          context: new ActionContext()
            .set(KeysQueryOperation.querySources, [ <any> 'abc', 'def' ]),
        })).resolves.toFailTest('actor can only handle a single forced SPARQL source');
      });

      it('should not pass for a file source', async() => {
        await expect(actor.test({
          url: 'URL',
          forceSourceType: 'file',
          context: new ActionContext()
            .set(KeysQueryOperation.querySources, [ <any> 'abc' ]),
        })).resolves.toFailTest('actor can only handle a single forced SPARQL source');
      });
    });

    describe('run', () => {
      it('should resolve', async() => {
        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
        });
        expect(source).toBe('QUERYSOURCE');
        expect(metadata).toEqual({ cardinality: { type: 'exact', value: 0 }});
        expect(dataset).toBe('MYDATASET');
      });
    });
  });
});
