import type { IActionDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type { IActionRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfUpdateQuadsHypermedia } from '../lib/ActorRdfUpdateQuadsHypermedia';

describe('ActorRdfUpdateQuadsHypermedia', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorDereferenceRdf: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorRdfUpdateHypermedia: any;
  let httpInvalidatorListener: any;
  let httpInvalidator: any;
  let destId: number;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfUpdateQuadsHypermedia instance', () => {
    let actor: ActorRdfUpdateQuadsHypermedia;

    beforeEach(() => {
      mediatorDereferenceRdf = {
        mediate: jest.fn(async({ url }: any) => {
          const data = {
            data: 'QUADS',
            exists: true,
            metadata: { triples: true },
            url,
            headers: 'HEADERS',
          };
          return data;
        }),
      };
      mediatorMetadata = {
        mediate: jest.fn(({ quads }: IActionRdfMetadata): Promise<IActorRdfMetadataOutput> =>
          Promise.resolve<IActorRdfMetadataOutput>(
            {
              quads,
              // @ts-expect-error
              metadata: { a: 1 },
            },
          )),
      };
      mediatorMetadataExtract = {
        mediate: jest.fn(({ metadata }: any) => Promise.resolve({ metadata })),
      };
      destId = 0;
      mediatorRdfUpdateHypermedia = {
        mediate: jest.fn(() => Promise.resolve({ destination: `DEST${destId++}` })),
      };
      httpInvalidator = {
        addInvalidateListener: (l: any) => httpInvalidatorListener = l,
      };
      actor = new ActorRdfUpdateQuadsHypermedia({
        name: 'actor',
        bus,
        cacheSize: 10,
        httpInvalidator,
        mediatorDereferenceRdf,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfUpdateHypermedia,
      });
    });

    describe('test', () => {
      it('should test', () => {
        return expect(actor.test({ context: new ActionContext(
          { [KeysRdfUpdateQuads.destination.name]: { value: 'abc' }},
        ) }))
          .resolves.toBeTruthy();
      });

      it('should test on raw destination form', () => {
        return expect(actor.test({ context: new ActionContext(
          { [KeysRdfUpdateQuads.destination.name]: 'abc' },
        ) }))
          .resolves.toBeTruthy();
      });

      it('should not test without a destination', () => {
        return expect(actor.test({ context: new ActionContext({}) })).rejects.toBeTruthy();
      });

      it('should not test on an invalid destination value', () => {
        return expect(actor.test({ context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: null }},
        ) }))
          .rejects.toBeTruthy();
      });
    });

    describe('getDestination', () => {
      beforeEach(() => {
        context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
      });

      it('should return a mediated destination', async() => {
        const destination = await actor.getDestination(context);
        expect(destination).toEqual('DEST0');

        expect(mediatorDereferenceRdf.mediate).toHaveBeenCalledWith<[IActionDereferenceRdf]>({
          context,
          url: 'abc',
          acceptErrors: true,
        });
        expect(mediatorMetadata.mediate).toHaveBeenCalledWith<[IActionRdfMetadata]>({
          context,
          url: 'abc',
          // @ts-expect-error
          quads: 'QUADS',
          triples: true,
        });
        expect(mediatorMetadataExtract.mediate).toHaveBeenCalledWith<[IActionRdfMetadataExtract]>({
          context,
          url: 'abc',
          // @ts-expect-error
          metadata: { a: 1 },
          // @ts-expect-error
          headers: 'HEADERS',
        });
        expect(mediatorRdfUpdateHypermedia.mediate).toHaveBeenCalledWith({
          context,
          forceDestinationType: '',
          metadata: { a: 1 },
          url: 'abc',
          exists: true,
        });
      });

      it('should return a mediated destination with a forced type', async() => {
        context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: { type: 'x', value: 'abc' }});
        const destination = await actor.getDestination(context);
        expect(destination).toEqual('DEST0');

        expect(mediatorRdfUpdateHypermedia.mediate).toHaveBeenCalledWith({
          context,
          forceDestinationType: 'x',
          metadata: { a: 1 },
          url: 'abc',
          exists: true,
        });
      });

      it('should cache the destination', async() => {
        const context1 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest1' });
        const context2 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest2' });
        const destination1 = await actor.getDestination(context1);
        const destination2 = await actor.getDestination(context2);
        expect(await actor.getDestination(context1)).toEqual(destination1);
        expect(await actor.getDestination(context2)).toEqual(destination2);
      });

      it('should cache the destination and allow invalidation for a specific url', async() => {
        const context1 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest1' });
        const context2 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest2' });
        const destination1 = await actor.getDestination(context1);
        const destination2 = await actor.getDestination(context2);

        httpInvalidatorListener({ url: 'dest1' });

        expect(await actor.getDestination(context1)).not.toEqual(destination1);
        expect(await actor.getDestination(context2)).toEqual(destination2);
      });

      it('should cache the destination and allow invalidation for no specific url', async() => {
        const context1 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest1' });
        const context2 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest2' });
        const destination1 = await actor.getDestination(context1);
        const destination2 = await actor.getDestination(context2);

        httpInvalidatorListener({});

        expect(await actor.getDestination(context1)).not.toEqual(destination1);
        expect(await actor.getDestination(context2)).not.toEqual(destination2);
      });

      it('should not cache the source with cache size 0', async() => {
        actor = new ActorRdfUpdateQuadsHypermedia({
          name: 'actor',
          bus,
          cacheSize: 0,
          httpInvalidator,
          mediatorDereferenceRdf,
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorRdfUpdateHypermedia,
        });

        const context1 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest1' });
        const context2 = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'dest2' });
        const destination1 = await actor.getDestination(context1);
        const destination2 = await actor.getDestination(context2);

        expect(await actor.getDestination(context1)).not.toEqual(destination1);
        expect(await actor.getDestination(context2)).not.toEqual(destination2);
      });

      it('should delegate dereference errors to the destination', async() => {
        const error = new Error('ActorRdfUpdateQuadsHypermedia dereference error');
        mediatorDereferenceRdf.mediate = () => Promise.reject(error);
        await actor.getDestination(context);

        expect(mediatorRdfUpdateHypermedia.mediate).toHaveBeenCalledWith({
          context,
          forceDestinationType: '',
          metadata: {},
          url: 'abc',
          exists: false,
        });
      });

      it('should delegate exist-false dereferences to the destination', async() => {
        mediatorDereferenceRdf.mediate = jest.fn(async({ url }: any) => {
          const data = {
            quads: 'QUADS',
            exists: false,
            triples: true,
            url,
            headers: 'HEADERS',
          };
          return data;
        });
        await actor.getDestination(context);

        expect(mediatorRdfUpdateHypermedia.mediate).toHaveBeenCalledWith({
          context,
          forceDestinationType: '',
          metadata: { a: 1 },
          url: 'abc',
          exists: false,
        });
      });
    });
  });
});
