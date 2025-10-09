import type {
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
  MediatorDereferenceRdf,
} from '@comunica/bus-dereference-rdf';
import type {
  IActionQuerySourceIdentifyHypermedia,
  MediatorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import { streamifyArray } from 'streamify-array';
import { ActorQuerySourceHypermediaResolveDereference } from '../lib/ActorQuerySourceHypermediaResolveDereference';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

const DF = new DataFactory();

describe('ActorQuerySourceHypermediaResolveDereference', () => {
  let bus: any;
  let mediatorDereferenceRdf: MediatorDereferenceRdf;
  let mediatorMetadata: MediatorRdfMetadata;
  let mediatorMetadataExtract: MediatorRdfMetadataExtract;
  let mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorDereferenceRdf = <MediatorDereferenceRdf> {
      async mediate({ url }: IActionDereferenceRdf): Promise<IActorDereferenceRdfOutput> {
        return {
          data: url === 'firstUrl' ?
            <any> streamifyArray([
              quad('s1', 'p1', 'o1'),
              quad('s2', 'p2', 'o2'),
            ]) :
            <any> streamifyArray([
              quad('s3', 'p3', 'o3'),
              quad('s4', 'p4', 'o4'),
            ]),
          metadata: { triples: true },
          exists: true,
          requestTime: 0,
          url,
        };
      },
    };
    mediatorMetadata = <MediatorRdfMetadata> {
      mediate: ({ quads }: any) => Promise.resolve({ data: quads, metadata: <any> { a: 1 }}),
    };
    mediatorMetadataExtract = <MediatorRdfMetadataExtract> {
      mediate: ({ metadata }: any) => Promise.resolve({ metadata }),
    };
    mediatorMetadataAccumulate = <MediatorRdfMetadataAccumulate> {
      async mediate(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
        if (action.mode === 'initialize') {
          return {
            metadata: {
              cardinality: { type: 'exact', value: 0 },
            },
          };
        }

        const metadata = { ...action.accumulatedMetadata };
        if (metadata.cardinality) {
          metadata.cardinality = { ...metadata.cardinality };
        }
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality) {
          // We're already at infinite, so ignore any later metadata
          metadata.cardinality = <any>{};
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        }
        if (metadata.cardinality?.value !== undefined && subMetadata.cardinality?.value !== undefined) {
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        if (subMetadata.cardinality?.type === 'estimate') {
          metadata.cardinality.type = 'estimate';
        }

        return { metadata };
      },
    };
    mediatorQuerySourceIdentifyHypermedia = <MediatorQuerySourceIdentifyHypermedia> {
      async mediate(_input: IActionQuerySourceIdentifyHypermedia) {
        return {
          dataset: 'MYDATASET',
          source: <IQuerySource> <any> 'QUERYSOURCE',
        };
      },
    };
  });

  describe('An ActorQuerySourceHypermediaResolveDereference instance', () => {
    let actor: ActorQuerySourceHypermediaResolveDereference;

    beforeEach(() => {
      actor = new ActorQuerySourceHypermediaResolveDereference({
        name: 'actor',
        bus,
        mediatorDereferenceRdf,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorMetadataAccumulate,
        mediatorQuerySourceIdentifyHypermedia,
      });
    });

    it('should test', async() => {
      await expect(actor.test({
        url: 'URL',
        context: new ActionContext(),
      })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('should resolve', async() => {
        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
        });
        expect(source).toBe('QUERYSOURCE');
        expect(metadata).toEqual({ a: 1 });
        expect(dataset).toBe('MYDATASET');
      });

      it('should resolve and mark the dataset in datasets', async() => {
        const handledDatasets = {};
        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
          handledDatasets,
        });
        expect(source).toBe('QUERYSOURCE');
        expect(metadata).toEqual({ a: 1 });
        expect(dataset).toBe('MYDATASET');
        expect(handledDatasets).toEqual({ MYDATASET: true });
      });

      it('should resolve and not mark an undefined dataset in datasets', async() => {
        mediatorQuerySourceIdentifyHypermedia.mediate = async(_input: IActionQuerySourceIdentifyHypermedia) => {
          return {
            source: <IQuerySource> <any> 'QUERYSOURCE',
          };
        };

        const handledDatasets = {};
        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
          handledDatasets,
        });
        expect(source).toBe('QUERYSOURCE');
        expect(metadata).toEqual({ a: 1 });
        expect(dataset).toBeUndefined();
        expect(handledDatasets).toEqual({});
      });

      it('should apply the link transformation', async() => {
        const transformQuads = jest.fn(inputQuads => inputQuads
          .map((q: RDF.Quad) => DF.quad(q.subject, q.predicate, DF.literal(`TRANSFORMED(${q.object.value})`))));
        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          transformQuads,
          context: new ActionContext(),
        });
        expect(source).toBe('QUERYSOURCE');
        expect(metadata).toEqual({ a: 1 });
        expect(dataset).toBe('MYDATASET');
        expect(transformQuads).toHaveBeenCalledWith(expect.any(require('node:stream').Readable), metadata);
      });

      it('should delegate dereference errors to the source', async() => {
        mediatorQuerySourceIdentifyHypermedia.mediate = async({ quads }: IActionQuerySourceIdentifyHypermedia) => {
          return <any> {
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          };
        };
        const error = new Error('MediatedLinkedRdfSourcesAsyncRdfIterator dereference error');
        mediatorDereferenceRdf.mediate = async() => {
          throw error;
        };

        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
        });
        expect(metadata).toEqual({ cardinality: { type: 'exact', value: 0 }});
        expect(dataset).toBe('MYDATASET');
        await expect(arrayifyStream((<any> source).sourceContents)).rejects.toThrow(error);
      });

      it('should ignore data errors', async() => {
        mediatorQuerySourceIdentifyHypermedia.mediate = async({ quads }: IActionQuerySourceIdentifyHypermedia) => {
          return <any> {
            dataset: 'MYDATASET',
            source: { sourceContents: quads },
          };
        };
        mediatorMetadata.mediate = <any> jest.fn(() => {
          const data = new Readable();
          data._read = () => null;
          data.on('newListener', (name: string) => {
            if (name === 'error') {
              setImmediate(() => data
                .emit('error', new Error('QuerySourceHypermedia ignored error')));
            }
          });
          return {
            data,
            metadata: { b: 1 },
          };
        });

        const { source, metadata, dataset } = await actor.run({
          url: 'startUrl',
          context: new ActionContext(),
        });
        expect(metadata).toEqual({ b: 1 });
        expect(dataset).toBe('MYDATASET');
        expect(source).toBeDefined();
        await new Promise(setImmediate);
      });
    });
  });
});
